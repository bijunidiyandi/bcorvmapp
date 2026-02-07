/*
  # Add Sample Data for Van Sales System

  1. Sample Data
    - Warehouses (2 warehouses)
    - Item Categories (3 categories)
    - Units (5 common units)
    - Items (15 products)
    - Customer Categories (3 categories)
    - Routes (3 routes)
    - Salesmen (2 salesmen)
    - Vans (2 vans)
    - Customers (10 customers)

  2. Notes
    - All sample data is realistic and ready for testing
    - Includes various product types and categories
    - Vans are already assigned to salesmen and warehouses
*/

-- Insert Warehouses
INSERT INTO warehouses (code, name, location, is_active) VALUES
  ('WH001', 'Main Warehouse', '123 Storage Street, Downtown', true),
  ('WH002', 'North Branch', '456 Industrial Ave, North District', true)
ON CONFLICT (code) DO NOTHING;

-- Insert Item Categories
INSERT INTO item_categories (code, name, description, is_active) VALUES
  ('CAT001', 'Beverages', 'Soft drinks, juices, and water', true),
  ('CAT002', 'Snacks', 'Chips, cookies, and crackers', true),
  ('CAT003', 'Dairy', 'Milk, yogurt, and cheese products', true)
ON CONFLICT (code) DO NOTHING;

-- Insert Units
INSERT INTO units (code, name, abbreviation, is_active) VALUES
  ('UNIT001', 'Piece', 'pc', true),
  ('UNIT002', 'Box', 'box', true),
  ('UNIT003', 'Liter', 'L', true),
  ('UNIT004', 'Kilogram', 'kg', true),
  ('UNIT005', 'Carton', 'ctn', true)
ON CONFLICT (code) DO NOTHING;

-- Insert Items
INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM001', 'Coca Cola 500ml', 'Refreshing cola drink', c.id, u.id, '1234567890001', 25.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT001' AND u.code = 'UNIT001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM002', 'Pepsi 500ml', 'Classic pepsi cola', c.id, u.id, '1234567890002', 25.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT001' AND u.code = 'UNIT001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM003', 'Mountain Dew 500ml', 'Citrus flavored drink', c.id, u.id, '1234567890003', 25.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT001' AND u.code = 'UNIT001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM004', 'Sprite 500ml', 'Lemon-lime soda', c.id, u.id, '1234567890004', 25.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT001' AND u.code = 'UNIT001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM005', 'Mineral Water 1L', 'Pure mineral water', c.id, u.id, '1234567890005', 15.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT001' AND u.code = 'UNIT003'
ON CONFLICT (code) DO NOTHING;

INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM006', 'Lays Classic 50g', 'Potato chips', c.id, u.id, '1234567890006', 30.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT002' AND u.code = 'UNIT001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM007', 'Pringles Original', 'Stackable chips', c.id, u.id, '1234567890007', 85.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT002' AND u.code = 'UNIT001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM008', 'Oreo Cookies', 'Chocolate sandwich cookies', c.id, u.id, '1234567890008', 45.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT002' AND u.code = 'UNIT001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM009', 'Cheetos Crunchy', 'Cheese flavored snacks', c.id, u.id, '1234567890009', 35.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT002' AND u.code = 'UNIT001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM010', 'Doritos Nacho Cheese', 'Tortilla chips', c.id, u.id, '1234567890010', 40.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT002' AND u.code = 'UNIT001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM011', 'Fresh Milk 1L', 'Full cream milk', c.id, u.id, '1234567890011', 55.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT003' AND u.code = 'UNIT003'
ON CONFLICT (code) DO NOTHING;

INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM012', 'Yogurt Cup', 'Strawberry yogurt', c.id, u.id, '1234567890012', 20.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT003' AND u.code = 'UNIT001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM013', 'Cheddar Cheese 200g', 'Sliced cheese', c.id, u.id, '1234567890013', 95.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT003' AND u.code = 'UNIT001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM014', 'Greek Yogurt 150g', 'Plain greek yogurt', c.id, u.id, '1234567890014', 45.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT003' AND u.code = 'UNIT001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO items (code, name, description, category_id, unit_id, barcode, price, tax_rate, is_active)
SELECT
  'ITEM015', 'Butter 250g', 'Salted butter', c.id, u.id, '1234567890015', 75.00, 5.00, true
FROM item_categories c, units u
WHERE c.code = 'CAT003' AND u.code = 'UNIT001'
ON CONFLICT (code) DO NOTHING;

-- Insert Customer Categories
INSERT INTO customer_categories (code, name, description, is_active) VALUES
  ('CCAT001', 'Retail', 'Small retail shops', true),
  ('CCAT002', 'Wholesale', 'Bulk buyers', true),
  ('CCAT003', 'Restaurants', 'Food service businesses', true)
ON CONFLICT (code) DO NOTHING;

-- Insert Routes
INSERT INTO routes (code, name, description, is_active) VALUES
  ('ROUTE001', 'Downtown Route', 'City center and surrounding areas', true),
  ('ROUTE002', 'North District', 'Northern suburbs and industrial area', true),
  ('ROUTE003', 'East Zone', 'Eastern residential areas', true)
ON CONFLICT (code) DO NOTHING;

-- Insert Salesmen
INSERT INTO salesmen (code, name, phone, email, is_active) VALUES
  ('SALES001', 'John Smith', '+1234567890', 'john@example.com', true),
  ('SALES002', 'Sarah Johnson', '+1234567891', 'sarah@example.com', true)
ON CONFLICT (code) DO NOTHING;

-- Update Vans with warehouse and salesman assignments
DO $$
DECLARE
  v_warehouse1_id uuid;
  v_warehouse2_id uuid;
  v_salesman1_id uuid;
  v_salesman2_id uuid;
  v_route1_id uuid;
  v_route2_id uuid;
BEGIN
  SELECT id INTO v_warehouse1_id FROM warehouses WHERE code = 'WH001';
  SELECT id INTO v_warehouse2_id FROM warehouses WHERE code = 'WH002';
  SELECT id INTO v_salesman1_id FROM salesmen WHERE code = 'SALES001';
  SELECT id INTO v_salesman2_id FROM salesmen WHERE code = 'SALES002';
  SELECT id INTO v_route1_id FROM routes WHERE code = 'ROUTE001';
  SELECT id INTO v_route2_id FROM routes WHERE code = 'ROUTE002';

  UPDATE vans SET 
    salesman_id = v_salesman1_id,
    warehouse_id = v_warehouse1_id,
    route_id = v_route1_id
  WHERE code = 'VAN001';

  UPDATE vans SET 
    salesman_id = v_salesman2_id,
    warehouse_id = v_warehouse2_id,
    route_id = v_route2_id
  WHERE code = 'VAN002';
END $$;

-- Insert Customers
INSERT INTO customers (code, name, category_id, contact_person, phone, address, city, route_id, is_active)
SELECT
  'CUST001', 'QuickMart Store', cc.id, 'Mike Wilson', '+1234567800', '789 Main St', 'Downtown', r.id, true
FROM customer_categories cc, routes r
WHERE cc.code = 'CCAT001' AND r.code = 'ROUTE001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, category_id, contact_person, phone, address, city, route_id, is_active)
SELECT
  'CUST002', 'FreshMart', cc.id, 'Lisa Brown', '+1234567801', '321 Oak Ave', 'Downtown', r.id, true
FROM customer_categories cc, routes r
WHERE cc.code = 'CCAT001' AND r.code = 'ROUTE001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, category_id, contact_person, phone, address, city, route_id, is_active)
SELECT
  'CUST003', 'MegaSupply Co', cc.id, 'Robert Davis', '+1234567802', '555 Industrial Blvd', 'North', r.id, true
FROM customer_categories cc, routes r
WHERE cc.code = 'CCAT002' AND r.code = 'ROUTE002'
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, category_id, contact_person, phone, address, city, route_id, is_active)
SELECT
  'CUST004', 'Corner Shop', cc.id, 'Emily Taylor', '+1234567803', '123 Elm St', 'East', r.id, true
FROM customer_categories cc, routes r
WHERE cc.code = 'CCAT001' AND r.code = 'ROUTE003'
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, category_id, contact_person, phone, address, city, route_id, is_active)
SELECT
  'CUST005', 'Pizza Palace', cc.id, 'Tom Anderson', '+1234567804', '777 Food Court', 'Downtown', r.id, true
FROM customer_categories cc, routes r
WHERE cc.code = 'CCAT003' AND r.code = 'ROUTE001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, category_id, contact_person, phone, address, city, route_id, is_active)
SELECT
  'CUST006', 'Burger Junction', cc.id, 'Nancy White', '+1234567805', '999 Burger Ln', 'North', r.id, true
FROM customer_categories cc, routes r
WHERE cc.code = 'CCAT003' AND r.code = 'ROUTE002'
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, category_id, contact_person, phone, address, city, route_id, is_active)
SELECT
  'CUST007', 'Daily Grocers', cc.id, 'Chris Martin', '+1234567806', '444 Market St', 'East', r.id, true
FROM customer_categories cc, routes r
WHERE cc.code = 'CCAT001' AND r.code = 'ROUTE003'
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, category_id, contact_person, phone, address, city, route_id, is_active)
SELECT
  'CUST008', 'SuperBuy Wholesale', cc.id, 'David Lee', '+1234567807', '888 Commerce Dr', 'North', r.id, true
FROM customer_categories cc, routes r
WHERE cc.code = 'CCAT002' AND r.code = 'ROUTE002'
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, category_id, contact_person, phone, address, city, route_id, is_active)
SELECT
  'CUST009', 'Cafe Express', cc.id, 'Jennifer Garcia', '+1234567808', '222 Coffee Ave', 'Downtown', r.id, true
FROM customer_categories cc, routes r
WHERE cc.code = 'CCAT003' AND r.code = 'ROUTE001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, category_id, contact_person, phone, address, city, route_id, is_active)
SELECT
  'CUST010', 'Neighborhood Store', cc.id, 'Kevin Moore', '+1234567809', '666 Residential Rd', 'East', r.id, true
FROM customer_categories cc, routes r
WHERE cc.code = 'CCAT001' AND r.code = 'ROUTE003'
ON CONFLICT (code) DO NOTHING;
