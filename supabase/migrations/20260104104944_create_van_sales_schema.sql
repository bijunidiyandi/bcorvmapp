/*
  # Van Sales Management System - Complete Database Schema

  1. New Tables
    - `salesmen` - Sales team members
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `phone` (text, nullable)
      - `email` (text, nullable)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `routes` - Delivery routes
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `description` (text, nullable)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `warehouses` - Warehouse locations
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `location` (text, nullable)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `vans` - Van fleet management
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `vehicle_number` (text)
      - `salesman_id` (uuid, foreign key to salesmen, nullable)
      - `route_id` (uuid, foreign key to routes, nullable)
      - `warehouse_id` (uuid, foreign key to warehouses, nullable)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `item_categories` - Product categories
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `description` (text, nullable)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `units` - Units of measure
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `abbreviation` (text)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `items` - Product catalog
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `description` (text, nullable)
      - `category_id` (uuid, foreign key to item_categories, nullable)
      - `unit_id` (uuid, foreign key to units, nullable)
      - `barcode` (text, unique, nullable)
      - `price` (numeric, default 0)
      - `tax_rate` (numeric, default 0)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `customer_categories` - Customer segments
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `description` (text, nullable)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `customers` - Customer database
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `category_id` (uuid, foreign key to customer_categories, nullable)
      - `contact_person` (text, nullable)
      - `phone` (text, nullable)
      - `email` (text, nullable)
      - `address` (text, nullable)
      - `city` (text, nullable)
      - `state` (text, nullable)
      - `postal_code` (text, nullable)
      - `tax_number` (text, nullable)
      - `credit_limit` (numeric, default 0)
      - `credit_days` (integer, default 0)
      - `route_id` (uuid, foreign key to routes, nullable)
      - `is_active` (boolean, default true)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `van_loads` - Van loading transactions
      - `id` (uuid, primary key)
      - `van_id` (uuid, foreign key to vans)
      - `load_date` (date)
      - `warehouse_id` (uuid, foreign key to warehouses)
      - `salesman_id` (uuid, foreign key to salesmen)
      - `status` (text, check constraint for pending/confirmed/cancelled)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `van_load_items` - Van load line items
      - `id` (uuid, primary key)
      - `van_load_id` (uuid, foreign key to van_loads)
      - `item_id` (uuid, foreign key to items)
      - `quantity` (numeric)
      - `batch_number` (text, nullable)
      - `expiry_date` (date, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
    
    - `sales_invoices` - Sales transactions
      - `id` (uuid, primary key)
      - `invoice_number` (text, unique)
      - `van_id` (uuid, foreign key to vans)
      - `customer_id` (uuid, foreign key to customers, nullable)
      - `walk_in_customer_name` (text, nullable)
      - `invoice_date` (date)
      - `subtotal` (numeric, default 0)
      - `tax_amount` (numeric, default 0)
      - `discount_amount` (numeric, default 0)
      - `total_amount` (numeric, default 0)
      - `payment_mode` (text, check constraint for cash/credit/card)
      - `payment_status` (text, check constraint for paid/partial/unpaid)
      - `paid_amount` (numeric, default 0)
      - `balance_amount` (numeric, default 0)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `sales_invoice_items` - Sales invoice line items
      - `id` (uuid, primary key)
      - `sales_invoice_id` (uuid, foreign key to sales_invoices)
      - `item_id` (uuid, foreign key to items)
      - `quantity` (numeric)
      - `unit_price` (numeric)
      - `discount_percent` (numeric, default 0)
      - `discount_amount` (numeric, default 0)
      - `tax_rate` (numeric, default 0)
      - `tax_amount` (numeric, default 0)
      - `line_total` (numeric)
      - `batch_number` (text, nullable)
      - `created_at` (timestamptz)
    
    - `sales_returns` - Sales return transactions
      - `id` (uuid, primary key)
      - `return_number` (text, unique)
      - `van_id` (uuid, foreign key to vans)
      - `customer_id` (uuid, foreign key to customers, nullable)
      - `invoice_id` (uuid, foreign key to sales_invoices, nullable)
      - `return_date` (date)
      - `return_type` (text, check constraint for good/damage)
      - `total_amount` (numeric, default 0)
      - `reason` (text, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `sales_return_items` - Sales return line items
      - `id` (uuid, primary key)
      - `sales_return_id` (uuid, foreign key to sales_returns)
      - `item_id` (uuid, foreign key to items)
      - `quantity` (numeric)
      - `unit_price` (numeric)
      - `line_total` (numeric)
      - `batch_number` (text, nullable)
      - `created_at` (timestamptz)
    
    - `day_closes` - Daily closing transactions
      - `id` (uuid, primary key)
      - `van_id` (uuid, foreign key to vans)
      - `close_date` (date)
      - `total_sales` (numeric, default 0)
      - `total_cash_collected` (numeric, default 0)
      - `total_expenses` (numeric, default 0)
      - `variance` (numeric, default 0)
      - `opening_stock_value` (numeric, default 0)
      - `closing_stock_value` (numeric, default 0)
      - `status` (text, check constraint for pending/closed/settled)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `day_close_expenses` - Daily expenses
      - `id` (uuid, primary key)
      - `day_close_id` (uuid, foreign key to day_closes)
      - `expense_type` (text, check constraint for fuel/parking/toll/other)
      - `amount` (numeric)
      - `description` (text, nullable)
      - `created_at` (timestamptz)
    
    - `settlements` - Settlement transactions
      - `id` (uuid, primary key)
      - `van_id` (uuid, foreign key to vans)
      - `day_close_id` (uuid, foreign key to day_closes)
      - `warehouse_id` (uuid, foreign key to warehouses)
      - `settlement_date` (date)
      - `stock_returned_value` (numeric, default 0)
      - `cash_deposited` (numeric, default 0)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `van_stocks` - Current van inventory
      - `id` (uuid, primary key)
      - `van_id` (uuid, foreign key to vans)
      - `item_id` (uuid, foreign key to items)
      - `quantity` (numeric, default 0)
      - `batch_number` (text, nullable)
      - `expiry_date` (date, nullable)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
*/

-- Create salesmen table
CREATE TABLE IF NOT EXISTS salesmen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE salesmen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view salesmen"
  ON salesmen FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create salesmen"
  ON salesmen FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update salesmen"
  ON salesmen FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete salesmen"
  ON salesmen FOR DELETE
  TO authenticated
  USING (true);

-- Create routes table
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view routes"
  ON routes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create routes"
  ON routes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update routes"
  ON routes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete routes"
  ON routes FOR DELETE
  TO authenticated
  USING (true);

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  location text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create warehouses"
  ON warehouses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update warehouses"
  ON warehouses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete warehouses"
  ON warehouses FOR DELETE
  TO authenticated
  USING (true);

-- Create vans table
CREATE TABLE IF NOT EXISTS vans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  vehicle_number text NOT NULL,
  salesman_id uuid REFERENCES salesmen(id) ON DELETE SET NULL,
  route_id uuid REFERENCES routes(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vans"
  ON vans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create vans"
  ON vans FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vans"
  ON vans FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete vans"
  ON vans FOR DELETE
  TO authenticated
  USING (true);

-- Create item_categories table
CREATE TABLE IF NOT EXISTS item_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view item_categories"
  ON item_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create item_categories"
  ON item_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update item_categories"
  ON item_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete item_categories"
  ON item_categories FOR DELETE
  TO authenticated
  USING (true);

-- Create units table
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  abbreviation text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view units"
  ON units FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create units"
  ON units FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update units"
  ON units FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete units"
  ON units FOR DELETE
  TO authenticated
  USING (true);

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES item_categories(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  barcode text UNIQUE,
  price numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view items"
  ON items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create items"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update items"
  ON items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete items"
  ON items FOR DELETE
  TO authenticated
  USING (true);

-- Create customer_categories table
CREATE TABLE IF NOT EXISTS customer_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customer_categories"
  ON customer_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create customer_categories"
  ON customer_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer_categories"
  ON customer_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customer_categories"
  ON customer_categories FOR DELETE
  TO authenticated
  USING (true);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category_id uuid REFERENCES customer_categories(id) ON DELETE SET NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  postal_code text,
  tax_number text,
  credit_limit numeric DEFAULT 0,
  credit_days integer DEFAULT 0,
  route_id uuid REFERENCES routes(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- Create van_loads table
CREATE TABLE IF NOT EXISTS van_loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  van_id uuid REFERENCES vans(id) ON DELETE CASCADE NOT NULL,
  load_date date NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE RESTRICT NOT NULL,
  salesman_id uuid REFERENCES salesmen(id) ON DELETE RESTRICT NOT NULL,
  status text CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE van_loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view van_loads"
  ON van_loads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create van_loads"
  ON van_loads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update van_loads"
  ON van_loads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete van_loads"
  ON van_loads FOR DELETE
  TO authenticated
  USING (true);

-- Create van_load_items table
CREATE TABLE IF NOT EXISTS van_load_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  van_load_id uuid REFERENCES van_loads(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES items(id) ON DELETE RESTRICT NOT NULL,
  quantity numeric NOT NULL,
  batch_number text,
  expiry_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE van_load_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view van_load_items"
  ON van_load_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create van_load_items"
  ON van_load_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update van_load_items"
  ON van_load_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete van_load_items"
  ON van_load_items FOR DELETE
  TO authenticated
  USING (true);

-- Create sales_invoices table
CREATE TABLE IF NOT EXISTS sales_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  van_id uuid REFERENCES vans(id) ON DELETE RESTRICT NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  walk_in_customer_name text,
  invoice_date date NOT NULL,
  subtotal numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  payment_mode text CHECK (payment_mode IN ('cash', 'credit', 'card')) DEFAULT 'cash',
  payment_status text CHECK (payment_status IN ('paid', 'partial', 'unpaid')) DEFAULT 'unpaid',
  paid_amount numeric DEFAULT 0,
  balance_amount numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales_invoices"
  ON sales_invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create sales_invoices"
  ON sales_invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales_invoices"
  ON sales_invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales_invoices"
  ON sales_invoices FOR DELETE
  TO authenticated
  USING (true);

-- Create sales_invoice_items table
CREATE TABLE IF NOT EXISTS sales_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_invoice_id uuid REFERENCES sales_invoices(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES items(id) ON DELETE RESTRICT NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  discount_percent numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  line_total numeric NOT NULL,
  batch_number text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales_invoice_items"
  ON sales_invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create sales_invoice_items"
  ON sales_invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales_invoice_items"
  ON sales_invoice_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales_invoice_items"
  ON sales_invoice_items FOR DELETE
  TO authenticated
  USING (true);

-- Create sales_returns table
CREATE TABLE IF NOT EXISTS sales_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number text UNIQUE NOT NULL,
  van_id uuid REFERENCES vans(id) ON DELETE RESTRICT NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES sales_invoices(id) ON DELETE SET NULL,
  return_date date NOT NULL,
  return_type text CHECK (return_type IN ('good', 'damage')) DEFAULT 'good',
  total_amount numeric DEFAULT 0,
  reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales_returns"
  ON sales_returns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create sales_returns"
  ON sales_returns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales_returns"
  ON sales_returns FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales_returns"
  ON sales_returns FOR DELETE
  TO authenticated
  USING (true);

-- Create sales_return_items table
CREATE TABLE IF NOT EXISTS sales_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_return_id uuid REFERENCES sales_returns(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES items(id) ON DELETE RESTRICT NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  line_total numeric NOT NULL,
  batch_number text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales_return_items"
  ON sales_return_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create sales_return_items"
  ON sales_return_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales_return_items"
  ON sales_return_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales_return_items"
  ON sales_return_items FOR DELETE
  TO authenticated
  USING (true);

-- Create day_closes table
CREATE TABLE IF NOT EXISTS day_closes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  van_id uuid REFERENCES vans(id) ON DELETE RESTRICT NOT NULL,
  close_date date NOT NULL,
  total_sales numeric DEFAULT 0,
  total_cash_collected numeric DEFAULT 0,
  total_expenses numeric DEFAULT 0,
  variance numeric DEFAULT 0,
  opening_stock_value numeric DEFAULT 0,
  closing_stock_value numeric DEFAULT 0,
  status text CHECK (status IN ('pending', 'closed', 'settled')) DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE day_closes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view day_closes"
  ON day_closes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create day_closes"
  ON day_closes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update day_closes"
  ON day_closes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete day_closes"
  ON day_closes FOR DELETE
  TO authenticated
  USING (true);

-- Create day_close_expenses table
CREATE TABLE IF NOT EXISTS day_close_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_close_id uuid REFERENCES day_closes(id) ON DELETE CASCADE NOT NULL,
  expense_type text CHECK (expense_type IN ('fuel', 'parking', 'toll', 'other')) NOT NULL,
  amount numeric NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE day_close_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view day_close_expenses"
  ON day_close_expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create day_close_expenses"
  ON day_close_expenses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update day_close_expenses"
  ON day_close_expenses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete day_close_expenses"
  ON day_close_expenses FOR DELETE
  TO authenticated
  USING (true);

-- Create settlements table
CREATE TABLE IF NOT EXISTS settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  van_id uuid REFERENCES vans(id) ON DELETE RESTRICT NOT NULL,
  day_close_id uuid REFERENCES day_closes(id) ON DELETE RESTRICT NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE RESTRICT NOT NULL,
  settlement_date date NOT NULL,
  stock_returned_value numeric DEFAULT 0,
  cash_deposited numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view settlements"
  ON settlements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create settlements"
  ON settlements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update settlements"
  ON settlements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete settlements"
  ON settlements FOR DELETE
  TO authenticated
  USING (true);

-- Create van_stocks table
CREATE TABLE IF NOT EXISTS van_stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  van_id uuid REFERENCES vans(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  quantity numeric DEFAULT 0,
  batch_number text,
  expiry_date date,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(van_id, item_id, batch_number)
);

ALTER TABLE van_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view van_stocks"
  ON van_stocks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create van_stocks"
  ON van_stocks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update van_stocks"
  ON van_stocks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete van_stocks"
  ON van_stocks FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vans_salesman ON vans(salesman_id);
CREATE INDEX IF NOT EXISTS idx_vans_route ON vans(route_id);
CREATE INDEX IF NOT EXISTS idx_vans_warehouse ON vans(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_unit ON items(unit_id);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_customers_category ON customers(category_id);
CREATE INDEX IF NOT EXISTS idx_customers_route ON customers(route_id);
CREATE INDEX IF NOT EXISTS idx_van_loads_van ON van_loads(van_id);
CREATE INDEX IF NOT EXISTS idx_van_loads_date ON van_loads(load_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_van ON sales_invoices(van_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer ON sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_returns_van ON sales_returns(van_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_date ON sales_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_day_closes_van ON day_closes(van_id);
CREATE INDEX IF NOT EXISTS idx_day_closes_date ON day_closes(close_date);
CREATE INDEX IF NOT EXISTS idx_van_stocks_van ON van_stocks(van_id);
CREATE INDEX IF NOT EXISTS idx_van_stocks_item ON van_stocks(item_id);
