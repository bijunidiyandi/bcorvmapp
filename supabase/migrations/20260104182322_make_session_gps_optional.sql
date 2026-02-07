/*
  # Make GPS fields optional in sales_sessions table

  1. Changes
    - Make `start_latitude` nullable
    - Make `start_longitude` nullable
    - Make `distance_from_customer` nullable

  2. Notes
    - Allows sessions to be created even when GPS is not available
    - Distance validation is now informational only, not enforced
*/

-- Make GPS fields nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales_sessions' AND column_name = 'start_latitude' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE sales_sessions ALTER COLUMN start_latitude DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales_sessions' AND column_name = 'start_longitude' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE sales_sessions ALTER COLUMN start_longitude DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales_sessions' AND column_name = 'distance_from_customer' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE sales_sessions ALTER COLUMN distance_from_customer DROP NOT NULL;
  END IF;
END $$;