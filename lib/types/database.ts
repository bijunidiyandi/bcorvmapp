export interface Database {
  public: {
    Tables: {
      vans: {
        Row: Van;
        Insert: Omit<Van, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Van, 'id' | 'created_at' | 'updated_at'>>;
      };
      routes: {
        Row: Route;
        Insert: Omit<Route, 'code'>;
        Update: Partial<Omit<Route, 'code' >>;
      };
      warehouses: {
        Row: Warehouse;
        Insert: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>>;
      };
      item_categories: {
        Row: ItemCategory;
        Insert: Omit<ItemCategory, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ItemCategory, 'id' | 'created_at' | 'updated_at'>>;
      };
      units: {
        Row: Unit;
        Insert: Omit<Unit, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Unit, 'id' | 'created_at' | 'updated_at'>>;
      };
      items: {
        Row: Item;
        Insert: Omit<Item, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Item, 'id' | 'created_at' | 'updated_at'>>;
      };
      customer_categories: {
        Row: CustomerCategory;
        Insert: Omit<CustomerCategory, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CustomerCategory, 'id' | 'created_at' | 'updated_at'>>;
      };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>;
      };
      van_loads: {
        Row: VanLoad;
        Insert: Omit<VanLoad, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<VanLoad, 'id' | 'created_at' | 'updated_at'>>;
      };
      van_load_items: {
        Row: VanLoadItem;
        Insert: Omit<VanLoadItem, 'id' | 'created_at'>;
        Update: Partial<Omit<VanLoadItem, 'id' | 'created_at'>>;
      };
      sales_invoices: {
        Row: SalesInvoice;
        Insert: Omit<SalesInvoice, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SalesInvoice, 'id' | 'created_at' | 'updated_at'>>;
      };
      sales_invoice_items: {
        Row: SalesInvoiceItem;
        Insert: Omit<SalesInvoiceItem, 'id' | 'created_at'>;
        Update: Partial<Omit<SalesInvoiceItem, 'id' | 'created_at'>>;
      };
      sales_returns: {
        Row: SalesReturn;
        Insert: Omit<SalesReturn, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SalesReturn, 'id' | 'created_at' | 'updated_at'>>;
      };
      sales_return_items: {
        Row: SalesReturnItem;
        Insert: Omit<SalesReturnItem, 'id' | 'created_at'>;
        Update: Partial<Omit<SalesReturnItem, 'id' | 'created_at'>>;
      };
      day_closes: {
        Row: DayClose;
        Insert: Omit<DayClose, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DayClose, 'id' | 'created_at' | 'updated_at'>>;
      };
      day_close_expenses: {
        Row: DayCloseExpense;
        Insert: Omit<DayCloseExpense, 'id' | 'created_at'>;
        Update: Partial<Omit<DayCloseExpense, 'id' | 'created_at'>>;
      };
      settlements: {
        Row: Settlement;
        Insert: Omit<Settlement, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Settlement, 'id' | 'created_at' | 'updated_at'>>;
      };
      van_stocks: {
        Row: VanStock;
        Insert: Omit<VanStock, 'id' | 'updated_at'>;
        Update: Partial<Omit<VanStock, 'id' | 'updated_at'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

export interface Van {
  id: string;
  code: string;
  vehicle_number: string;
  user_id: string | null;
  route_id: string | null;
  warehouse_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Route {
 
  code: string;
  name: string;
  description: string;
  lastModifiedBy: string;
  lastModifiedOn?: string | null;
  active: boolean;
}
export type CreateRouteInput = {
  code: string;
  name: string;
  description: string;
  active?: boolean;
};

export interface Warehouse {
  code: string;
  name: string;
  location: string;
  lastModifiedBy: string;
  lastModifiedOn?: string;
  active: boolean;
}

export interface CreateWarehouseInput {
  code: string;
  name: string;
  location: string;
  active?: boolean;
}

export interface ItemCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  abbreviation: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category_id: string | null;
  unit_id: string | null;
  barcode: string | null;
  price: number;
  tax_rate: number;
  taxcode: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  category_id: string | null;
  route_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  credit_limit: number;
  outstanding_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VanLoad {
  id: string;
  van_id: string;
  load_date: string;
  warehouse_id: string;
  user_id: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VanLoadItem {
  id: string;
  van_load_id: string;
  item_id: string;
  quantity: number;
  batch_number: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface SalesInvoice {
  id: string;
  invoice_number: string;
  van_id: string;
  customer_id: string | null;
  walk_in_customer_name: string | null;
  invoice_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_mode: 'cash' | 'credit' | 'card';
  payment_status: 'paid' | 'partial' | 'unpaid';
  paid_amount: number;
  balance_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesInvoiceItem {
  id: string;
  sales_invoice_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  batch_number: string | null;
  created_at: string;
}

export interface SalesReturn {
  id: string;
  return_number: string;
  van_id: string;
  customer_id: string | null;
  invoice_id: string | null;
  return_date: string;
  return_type: 'good' | 'damage';
  total_amount: number;
  reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesReturnItem {
  id: string;
  sales_return_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  batch_number: string | null;
  created_at: string;
}

export interface DayClose {
  id: string;
  van_id: string;
  close_date: string;
  total_sales: number;
  total_cash_collected: number;
  total_expenses: number;
  variance: number;
  opening_stock_value: number;
  closing_stock_value: number;
  status: 'pending' | 'closed' | 'settled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DayCloseExpense {
  id: string;
  day_close_id: string;
  expense_type: 'fuel' | 'parking' | 'toll' | 'other';
  amount: number;
  description: string | null;
  created_at: string;
}

export interface Settlement {
  id: string;
  van_id: string;
  day_close_id: string;
  warehouse_id: string;
  settlement_date: string;
  stock_returned_value: number;
  cash_deposited: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VanStock {
  id: string;
  van_id: string;
  item_id: string;
  quantity: number;
  last_updated: string;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  van_id: string;
  customer_id: string;
  invoice_id: string | null;
  receipt_date: string;
  amount: number;
  payment_mode: 'cash' | 'card' | 'cheque' | 'bank_transfer';
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesSession {
  id: string;
  van_id: string;
  customer_id: string;
  start_time: string;
  end_time: string | null;
  start_latitude: number | null;
  start_longitude: number | null;
  end_latitude: number | null;
  end_longitude: number | null;
  distance_from_customer: number | null;
  status: 'active' | 'closed';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  user_id: string | null;
  route_id: string | null;
  schedule_date: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleCustomer {
  id: string;
  schedule_id: string;
  customer_id: string;
  visit_order: number;
  planned_time: string | null;
  visit_status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  actual_visit_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VanWithDetails extends Van {
  user?: User;
  route?: Route;
  warehouse?: Warehouse;
}

export interface ItemWithDetails extends Item {
  category?: ItemCategory;
  unit?: Unit;
}

export interface CustomerWithDetails extends Customer {
  category?: CustomerCategory;
  route?: Route;
}

export interface VanLoadWithDetails extends VanLoad {
  van?: Van;
  warehouse?: Warehouse;
  user?: User;
  items?: (VanLoadItem & { item?: Item })[];
}

export interface SalesInvoiceWithDetails extends SalesInvoice {
  van?: Van;
  customer?: Customer;
  items?: (SalesInvoiceItem & { item?: Item })[];
}

export interface SalesReturnWithDetails extends SalesReturn {
  van?: Van;
  customer?: Customer;
  invoice?: SalesInvoice;
  items?: (SalesReturnItem & { item?: Item })[];
}

export interface DayCloseWithDetails extends DayClose {
  van?: Van;
  expenses?: DayCloseExpense[];
}

export interface SettlementWithDetails extends Settlement {
  van?: Van;
  day_close?: DayClose;
  warehouse?: Warehouse;
}

export interface ReceiptWithDetails extends Receipt {
  van?: Van;
  customer?: Customer;
  invoice?: SalesInvoice;
}

export interface SalesSessionWithDetails extends SalesSession {
  van?: Van;
  customer?: CustomerWithDetails;
}

export interface ScheduleWithDetails extends Schedule {
  user?: User;
  route?: Route;
  customers?: (ScheduleCustomer & { customer?: CustomerWithDetails })[];
}

export interface ScheduleCustomerWithDetails extends ScheduleCustomer {
  customer?: CustomerWithDetails;
  schedule?: Schedule;
}

export interface VanStockWithDetails extends VanStock {
  van?: Van;
  item?: ItemWithDetails;
}

export interface DashboardMetrics {
  totalVans: number;
  activeVans: number;
  todaySales: number;
  todayCollections: number;
  pendingDayCloses: number;
  totalCustomers: number;
  lowStockItems: number;
}

export interface User {
  id: string;
  user_id: string;
  user_name: string;
  password_hash: string;
  role: 'SALES_MANAGER' | 'SALESMAN';
  default_van_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithDetails extends User {
  default_van?: Van;
}

export interface LoginResponse {
  user: Omit<User, 'password_hash'>;
  token?: string;
}

export type UserRole = 'SALES_MANAGER' | 'SALESMAN';
export type PaymentMode = 'cash' | 'credit' | 'card';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type ReturnType = 'good' | 'damage';
export type ExpenseType = 'fuel' | 'parking' | 'toll' | 'other';
export type VanLoadStatus = 'pending' | 'confirmed' | 'cancelled';
export type DayCloseStatus = 'pending' | 'closed' | 'settled';
