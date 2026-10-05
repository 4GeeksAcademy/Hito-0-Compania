from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


# ════════════════════════════════════════════
# Modelo ORM: Producto (SKU de almacén)
# ════════════════════════════════════════════
class Product(SQLModel, table=True):
    """Representa un producto/SKU almacenado en los warehouses de TrackFlow.

    TrackFlow gestiona inventario en dos almacenes (Los Ángeles y Zaragoza).
    El stock no se almacena como columna; se calcula dinámicamente a partir
    de las órdenes de entrada y salida.
    """

    __tablename__: str = "products"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(min_length=1, max_length=255)
    sku: str = Field(min_length=1, max_length=100, unique=True, index=True)
    description: Optional[str] = Field(default=None, max_length=500)
    category: Optional[str] = Field(default=None, max_length=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ════════════════════════════════════════════
# Modelo ORM: Orden de Entrada (incrementa stock)
# ════════════════════════════════════════════
class InboundOrder(SQLModel, table=True):
    """Registra la entrada de productos a un almacén.

    Cada orden de entrada incrementa el stock del producto en el warehouse
    especificado. Las órdenes son trazables al usuario que las creó (user_uuid
    proviene de TinyDB, sin FK — no se replica la tabla de usuarios en Supabase).
    """

    __tablename__: str = "inbound_orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="products.id", index=True)
    quantity: int = Field(gt=0)
    warehouse: str = Field(min_length=1, max_length=100)
    user_uuid: str = Field(min_length=1, max_length=255)
    notes: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ════════════════════════════════════════════
# Modelo ORM: Orden de Salida (reduce stock)
# ════════════════════════════════════════════
class OutboundOrder(SQLModel, table=True):
    """Registra la salida de productos de un almacén.

    Cada orden de salida reduce el stock del producto en el warehouse
    especificado. Se valida que no genere stock negativo antes de persistir.
    Las órdenes son trazables al usuario que las creó.
    """

    __tablename__: str = "outbound_orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="products.id", index=True)
    quantity: int = Field(gt=0)
    warehouse: str = Field(min_length=1, max_length=100)
    user_uuid: str = Field(min_length=1, max_length=255)
    notes: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))