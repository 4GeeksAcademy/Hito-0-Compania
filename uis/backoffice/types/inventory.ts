export type Warehouse = "Los Angeles" | "Zaragoza";

export type Product = {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  category: string | null;
  current_stock: number;
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