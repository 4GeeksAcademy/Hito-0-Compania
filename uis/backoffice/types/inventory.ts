export type Warehouse = "Los Angeles" | "Zaragoza";

export type Product = {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  category: string | null;
  current_stock: number;
};

export type ProductCreate = {
  name: string;
  sku: string;
  description: string | null;
  category: string | null;
};

export type OrderCreate = {
  product_id: number;
  quantity: number;
  warehouse: Warehouse;
  notes: string | null;
};

export type InventoryOrder = OrderCreate & {
  id: number;
  type: "inbound" | "outbound";
  product_name: string;
  product_sku: string;
  user_uuid: string;
  created_at: string;
};

export type PickingTaskCreate = OrderCreate;

export type PickingTask = PickingTaskCreate & {
  id: number;
  product_name: string;
  product_sku: string;
  user_uuid: string;
  status: "pending" | "picked";
  outbound_order_id: number | null;
  demo_tracking_stage: "pending_pick" | "ready_for_dispatch" | "in_transit_demo" | "delivered_demo";
  demo_tracking_updated_at: string;
  created_at: string;
  picked_at: string | null;
};