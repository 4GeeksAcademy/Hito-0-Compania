from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, func, select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.inventory import InboundOrder, OutboundOrder, Product
from app.schemas.inventory import (
    InboundOrderCreate,
    InboundOrderResponse,
    OutboundOrderCreate,
    OutboundOrderResponse,
    PaginatedProductsResponse,
    ProductCreate,
    ProductResponse,
)


router = APIRouter(
    prefix="/inventory",
    tags=["inventory"],
)


# ════════════════════════════════════════════
# Funciones auxiliares
# ════════════════════════════════════════════

def _calculate_stock(db_session: Session, product_id: int, warehouse: str | None = None) -> int:
    """Calcula el stock actual de un producto.

    El stock se deriva del historial de órdenes:
        current_stock = SUM(entradas) - SUM(salidas)

    Si se especifica `warehouse`, el cálculo se acota a ese almacén.
    """
    # Suma de entradas
    inbound_query = select(func.coalesce(func.sum(InboundOrder.quantity), 0)).where(
        InboundOrder.product_id == product_id,
    )
    if warehouse:
        inbound_query = inbound_query.where(InboundOrder.warehouse == warehouse)
    total_inbound = db_session.exec(inbound_query).one()

    # Suma de salidas
    outbound_query = select(func.coalesce(func.sum(OutboundOrder.quantity), 0)).where(
        OutboundOrder.product_id == product_id,
    )
    if warehouse:
        outbound_query = outbound_query.where(OutboundOrder.warehouse == warehouse)
    total_outbound = db_session.exec(outbound_query).one()

    return total_inbound - total_outbound


def _product_to_response(product: Product, db_session: Session, warehouse: str | None = None) -> ProductResponse:
    """Convierte un modelo ORM Product a ProductResponse con stock calculado."""
    stock = _calculate_stock(db_session, product.id, warehouse=warehouse)
    return ProductResponse(
        id=product.id,
        name=product.name,
        sku=product.sku,
        description=product.description,
        category=product.category,
        created_at=product.created_at,
        current_stock=stock,
    )


# ════════════════════════════════════════════
# Endpoints de Productos
# ════════════════════════════════════════════

@router.get("/products", response_model=PaginatedProductsResponse)
def list_products(
    warehouse: str | None = Query(default=None, description="Filtrar stock por almacén"),
    db_session: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista todos los productos con su stock actual calculado.

    El stock se calcula dinámicamente como entradas - salidas.
    Opcionalmente se puede filtrar por almacén.
    """
    products = db_session.exec(select(Product)).all()
    items = [
        _product_to_response(p, db_session, warehouse=warehouse)
        for p in products
    ]
    return PaginatedProductsResponse(items=items)


@router.post("/products", response_model=ProductResponse, status_code=201)
def create_product(
    payload: ProductCreate,
    db_session: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Crea un nuevo producto. Requiere autenticación."""
    # Verificar que el SKU no exista ya
    existing = db_session.exec(
        select(Product).where(Product.sku == payload.sku)
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Ya existe un producto con el SKU '{payload.sku}'",
        )

    product = Product(
        name=payload.name,
        sku=payload.sku,
        description=payload.description,
        category=payload.category,
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    return _product_to_response(product, db_session)


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    warehouse: str | None = Query(default=None, description="Filtrar stock por almacén"),
    db_session: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtiene un producto por ID con su stock actual calculado."""
    product = db_session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    return _product_to_response(product, db_session, warehouse=warehouse)


# ════════════════════════════════════════════
# Endpoints de Órdenes
# ════════════════════════════════════════════

@router.post("/orders/inbound", response_model=InboundOrderResponse, status_code=201)
def create_inbound_order(
    payload: InboundOrderCreate,
    db_session: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Registra una orden de entrada (incrementa stock).

    Requiere autenticación. El user_uuid se obtiene del token JWT de TinyDB.
    """
    # Validar que el producto exista
    product = db_session.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    order = InboundOrder(
        product_id=payload.product_id,
        quantity=payload.quantity,
        warehouse=payload.warehouse,
        user_uuid=current_user["id"],
        notes=payload.notes,
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)

    return InboundOrderResponse(
        id=order.id,
        product_id=order.product_id,
        quantity=order.quantity,
        warehouse=order.warehouse,
        user_uuid=order.user_uuid,
        notes=order.notes,
        created_at=order.created_at,
    )


@router.post("/orders/outbound", response_model=OutboundOrderResponse, status_code=201)
def create_outbound_order(
    payload: OutboundOrderCreate,
    db_session: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Registra una orden de salida (reduce stock).

    Requiere autenticación. Valida que el stock resultante no sea negativo.
    El user_uuid se obtiene del token JWT de TinyDB.
    """
    # Validar que el producto exista
    product = db_session.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Validar stock negativo ANTES de persistir
    current_stock = _calculate_stock(db_session, payload.product_id, warehouse=payload.warehouse)
    if current_stock < payload.quantity:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Stock insuficiente en almacén '{payload.warehouse}'. "
                f"Disponible: {current_stock}, solicitado: {payload.quantity}"
            ),
        )

    order = OutboundOrder(
        product_id=payload.product_id,
        quantity=payload.quantity,
        warehouse=payload.warehouse,
        user_uuid=current_user["id"],
        notes=payload.notes,
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)

    return OutboundOrderResponse(
        id=order.id,
        product_id=order.product_id,
        quantity=order.quantity,
        warehouse=order.warehouse,
        user_uuid=order.user_uuid,
        notes=order.notes,
        created_at=order.created_at,
    )


@router.get("/orders")
def list_orders(
    db_session: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista todas las órdenes (entrada y salida) con datos del producto.

    Cada orden incluye el nombre y SKU del producto asociado.
    """
    # Órdenes de entrada con JOIN a productos
    inbound = db_session.exec(
        select(InboundOrder, Product.name, Product.sku)
        .join(Product, InboundOrder.product_id == Product.id)
    ).all()

    # Órdenes de salida con JOIN a productos
    outbound = db_session.exec(
        select(OutboundOrder, Product.name, Product.sku)
        .join(Product, OutboundOrder.product_id == Product.id)
    ).all()

    result = []

    for order, product_name, product_sku in inbound:
        result.append({
            "type": "inbound",
            "id": order.id,
            "product_id": order.product_id,
            "product_name": product_name,
            "product_sku": product_sku,
            "quantity": order.quantity,
            "warehouse": order.warehouse,
            "user_uuid": order.user_uuid,
            "notes": order.notes,
            "created_at": order.created_at.isoformat(),
        })

    for order, product_name, product_sku in outbound:
        result.append({
            "type": "outbound",
            "id": order.id,
            "product_id": order.product_id,
            "product_name": product_name,
            "product_sku": product_sku,
            "quantity": order.quantity,
            "warehouse": order.warehouse,
            "user_uuid": order.user_uuid,
            "notes": order.notes,
            "created_at": order.created_at.isoformat(),
        })

    # Ordenar por fecha descendente
    result.sort(key=lambda x: x["created_at"], reverse=True)

    return result