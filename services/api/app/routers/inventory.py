from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, func, select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.inventory import InboundOrder, OutboundOrder, PickTask, Product
from app.schemas.inventory import (
    InboundOrderCreate,
    InboundOrderResponse,
    OutboundOrderCreate,
    OutboundOrderResponse,
    PickingTaskCreate,
    PickingTaskResponse,
    PaginatedProductsResponse,
    ProductCreate,
    ProductResponse,
)

from cache import build_cache_key, get_cached, invalidate_cache, set_cached


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


def _picking_task_to_response(task: PickTask, product_name: str, product_sku: str) -> PickingTaskResponse:
    return PickingTaskResponse(
        id=task.id,
        product_id=task.product_id,
        product_name=product_name,
        product_sku=product_sku,
        quantity=task.quantity,
        warehouse=task.warehouse,
        user_uuid=task.user_uuid,
        notes=task.notes,
        status=task.status,
        outbound_order_id=task.outbound_order_id,
        demo_tracking_stage=task.demo_tracking_stage,
        demo_tracking_updated_at=task.demo_tracking_updated_at,
        created_at=task.created_at,
        picked_at=task.picked_at,
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

    Resultado cacheado con TTL de 30 segundos. Se invalida al crear
    productos u órdenes de inventario.
    """
    cache_key = build_cache_key("list_products", warehouse=warehouse)
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

    products = db_session.exec(select(Product)).all()
    items = [
        _product_to_response(p, db_session, warehouse=warehouse)
        for p in products
    ]
    result = PaginatedProductsResponse(items=items)

    set_cached(cache_key, result, ttl_seconds=30)
    return result


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

    invalidate_cache("list_products")

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

    invalidate_cache("list_products")

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

    invalidate_cache("list_products")

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


# ════════════════════════════════════════════
# Tareas de picking y seguimiento de demostración
# ════════════════════════════════════════════

@router.get("/picking/tasks", response_model=list[PickingTaskResponse])
def list_picking_tasks(
    db_session: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tasks = db_session.exec(
        select(PickTask, Product.name, Product.sku)
        .join(Product, PickTask.product_id == Product.id)
        .order_by(PickTask.created_at.desc())
    ).all()
    return [_picking_task_to_response(task, product_name, product_sku) for task, product_name, product_sku in tasks]


@router.post("/picking/tasks", response_model=PickingTaskResponse, status_code=201)
def create_picking_task(
    payload: PickingTaskCreate,
    db_session: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    product = db_session.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    stock = _calculate_stock(db_session, payload.product_id, warehouse=payload.warehouse)
    if stock < payload.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Stock insuficiente en {payload.warehouse}. Disponible: {stock}.",
        )

    task = PickTask(
        product_id=payload.product_id,
        quantity=payload.quantity,
        warehouse=payload.warehouse,
        user_uuid=current_user["id"],
        notes=payload.notes,
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    return _picking_task_to_response(task, product.name, product.sku)


@router.post("/picking/tasks/{task_id}/complete", response_model=PickingTaskResponse)
def complete_picking_task(
    task_id: int,
    db_session: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    task = db_session.get(PickTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea de picking no encontrada")

    product = db_session.get(Product, task.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if task.status == "picked":
        return _picking_task_to_response(task, product.name, product.sku)

    stock = _calculate_stock(db_session, task.product_id, warehouse=task.warehouse)
    if stock < task.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Stock insuficiente en {task.warehouse}. Disponible: {stock}.",
        )

    now = datetime.now(timezone.utc)
    notes = f"Picking #{task.id} confirmado"
    if task.notes:
        notes = f"{notes}. {task.notes}"

    outbound_order = OutboundOrder(
        product_id=task.product_id,
        quantity=task.quantity,
        warehouse=task.warehouse,
        user_uuid=current_user["id"],
        notes=notes[:500],
    )
    db_session.add(outbound_order)
    db_session.flush()

    task.status = "picked"
    task.outbound_order_id = outbound_order.id
    task.picked_at = now
    task.demo_tracking_stage = "ready_for_dispatch"
    task.demo_tracking_updated_at = now
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    invalidate_cache("list_products")
    return _picking_task_to_response(task, product.name, product.sku)


@router.post("/picking/tasks/{task_id}/tracking-demo/advance", response_model=PickingTaskResponse)
def advance_demo_tracking(
    task_id: int,
    db_session: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    task = db_session.get(PickTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea de picking no encontrada")
    if task.status != "picked":
        raise HTTPException(status_code=409, detail="Confirma el picking antes de simular el tracking")

    next_stage = {
        "ready_for_dispatch": "in_transit_demo",
        "in_transit_demo": "delivered_demo",
    }.get(task.demo_tracking_stage)
    if not next_stage:
        raise HTTPException(status_code=409, detail="El tracking de demostración ya llegó a su último paso")

    task.demo_tracking_stage = next_stage
    task.demo_tracking_updated_at = datetime.now(timezone.utc)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    product = db_session.get(Product, task.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return _picking_task_to_response(task, product.name, product.sku)