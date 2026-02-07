/*
  # Create Receipts Table

  1. New Tables
    - `receipts`
      - `id` (uuid, primary key)
      - `receipt_number` (text, unique) - Unique receipt identifier
      - `van_id` (uuid, foreign key to vans) - Van collecting the payment
      - `customer_id` (uuid, foreign key to customers) - Customer making payment
      - `invoice_id` (uuid, nullable, foreign key to sales_invoices) - Related invoice if paying against specific invoice
      - `receipt_date` (date) - Date of payment collection
      - `amount` (numeric) - Payment amount received
      - `payment_mode` (text) - Mode of payment (cash/card/cheque/bank_transfer)
      - `reference_number` (text, nullable) - Cheque number, transaction ID, etc.
      - `notes` (text, nullable) - Additional notes
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `receipts` table
    - Add policy for authenticated users to read receipts
    - Add policy for authenticated users to create receipts
    - Add policy for authenticated users to update receipts
    - Add policy for authenticated users to delete receipts

  3. Indexes
    - Index on receipt_number for fast lookups
    - Index on van_id for van-specific queries
    - Index on customer_id for customer payment history
    - Index on receipt_date for date-based reporting
*/

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL,
  van_id uuid NOT NULL REFERENCES vans(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  invoice_id uuid REFERENCES sales_invoices(id),
  receipt_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_mode text NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'card', 'cheque', 'bank_transfer')),
  reference_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_van_id ON receipts(van_id);
CREATE INDEX IF NOT EXISTS idx_receipts_customer_id ON receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_date ON receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON receipts(invoice_id);

-- Enable Row Level Security
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can read receipts"
  ON receipts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create receipts"
  ON receipts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update receipts"
  ON receipts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete receipts"
  ON receipts FOR DELETE
  TO authenticated
  USING (true);
