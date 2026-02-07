/*
  # Add Tax Code to Items Table

  1. Changes
    - Add `taxcode` column to `items` table (varchar(10))
    - Set default value to 'tx5' (5% tax) for existing items
    - Add check constraint to ensure only valid tax codes are used

  2. Notes
    - Tax codes: 'tx5' for 5% tax, 'tx10' for 10% tax
    - Existing items will default to 5% tax rate
*/

-- Add taxcode column to items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'taxcode'
  ) THEN
    ALTER TABLE items ADD COLUMN taxcode varchar(10) DEFAULT 'tx5';
  END IF;
END $$;

-- Add check constraint for valid tax codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'items_taxcode_check'
  ) THEN
    ALTER TABLE items ADD CONSTRAINT items_taxcode_check 
    CHECK (taxcode IN ('tx5', 'tx10'));
  END IF;
END $$;
