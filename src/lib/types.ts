// Types — مطابقة لجداول mazaya_ في قاعدة البيانات
export interface Supplier {
  id: number;
  name: string;
  payment_type: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
}
export interface Branch {
  id: number;
  name: string;
  location: string | null;
  phone: string | null;
  notes: string | null;
}
export interface Customer {
  id: number;
  name: string;
  branch_id: number | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}
export interface Order {
  id: number;
  order_name: string;
  customer_id: number | null;
  branch_id: number | null;
  order_type: "new" | "maintenance";
  parent_order_id: number | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  status: "open" | "in_progress" | "completed" | "delivered";
  notes: string | null;
}
export interface Board {
  id: number;
  item_name: string;
  material_type: string | null;
  code: string;
  supplier_id: number | null;
  unit_price: number;
  quantity_in: number;
  total_price: number;
  date_added: string;
  linked_order_id: number | null;
  quantity_used: number;
  quantity_remaining: number;
  notes: string | null;
}
export interface Accessory {
  id: number;
  item_name: string;
  type: string | null;
  code: string;
  supplier_id: number | null;
  unit_price: number;
  quantity_in: number;
  total_price: number;
  date_added: string;
  linked_order_id: number | null;
  quantity_used: number;
  quantity_remaining: number;
  notes: string | null;
}
export interface OrderMaterial {
  id: number;
  order_id: number;
  board_id: number | null;
  accessory_id: number | null;
  quantity_used: number;
  unit_price_snapshot: number;
  line_total: number;
}
export interface OrderCost {
  id: number;
  order_id: number;
  boards_cost: number;
  accessories_cost: number;
  installation_cost: number;
  installation_travel_days: number;
  internal_transport_cost: number;
  external_transport_cost: number;
  factory_commission: number;
  order_total: number;
}
export interface Contractor {
  id: number;
  name: string;
  type: string | null;
  phone: string | null;
  notes: string | null;
}
export interface OrderExternalWork {
  id: number;
  order_id: number;
  work_type: string | null;
  contractor_id: number | null;
  amount: number | null;
  notes: string | null;
}
export interface JournalEntry {
  id: number;
  entry_date: string;
  entry_type: "purchase" | "income" | "expense" | "transfer" | "overhead";
  description: string;
  amount: number;
  payment_method: string | null;
  supplier_id: number | null;
  branch_id: number | null;
  contractor_id: number | null;
  order_id: number | null;
  is_passthrough: boolean;
  notes: string | null;
}
export interface OverheadExpense {
  id: number;
  expense_date: string;
  description: string;
  amount: number;
  notes: string | null;
}
