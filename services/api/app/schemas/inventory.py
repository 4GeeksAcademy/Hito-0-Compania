from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ════════════════════════════════════════════
# Schemas de Producto
# ════════════════════════════════════════════

class ProductCreate(BaseModel):
    """Schema para crear un nuevo producto."""
    name: str = Field(min_length=1, max_length=255)
    sku: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    category: Optional[str] = Field(default=None, max_length=100)


class ProductUpdate(BaseModel):
    """Schema para actualizar un producto."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    sku: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    category: Optional[str] = Field(default=None, max_length=100)


class ProductResponse(BaseModel):
    """Schema de respuesta para un producto.

    Incluye el campo calculado `current_stock` que no existe en el modelo ORM.
    """
    id: int
    name: str
    sku: str
    description: Optional[str] = None
    category: Optional[str] = None
    created_at: datetime
    current_stock: int = 0

    model_config = {"from_attributes": True}


# ════════════════════════════════════════════
# Schemas de Órdenes de Entrada
# ════════════════════════════════════════════

class InboundOrderCreate(BaseModel):
    """Schema para registrar una orden de entrada."""
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0)
    warehouse: str = Field(min_length=1, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=500)


class InboundOrderResponse(BaseModel):
    """Schema de respuesta para una orden de entrada."""
    id: int
    product_id: int
    quantity: int
    warehouse: str
    user_uuid: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ════════════════════════════════════════════
# Schemas de Órdenes de Salida
# ════════════════════════════════════════════

class OutboundOrderCreate(BaseModel):
    """Schema para registrar una orden de salida."""
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0)
    warehouse: str = Field(min_length=1, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=500)


class OutboundOrderResponse(BaseModel):
    """Schema de respuesta para una orden de salida."""
    id: int
    product_id: int
    quantity: int
    warehouse: str
    user_uuid: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ════════════════════════════════════════════
# Schemas de listado
# ════════════════════════════════════════════

class PaginatedProductsResponse(BaseModel):
    """Respuesta paginada de productos."""
    items: list[ProductResponse]


class InboundOrderListResponse(BaseModel):
    """Schema para listar órdenes de entrada con info adicional."""
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    quantity: int
    warehouse: str
    user_uuid: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OutboundOrderListResponse(BaseModel):
    """Schema para listar órdenes de salida con info adicional."""
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    quantity: int
    warehouse: str
    user_uuid: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}