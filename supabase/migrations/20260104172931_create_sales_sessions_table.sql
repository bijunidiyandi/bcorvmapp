/*
  # Create Sales Sessions Table

  1. New Tables
    - `sales_sessions`
      - `id` (uuid, primary key) - Unique session identifier
      - `van_id` (uuid, foreign key to vans) - Van performing the session
      - `customer_id` (uuid, foreign key to customers) - Customer being visited
      - `start_time` (timestamptz) - Session start timestamp
      - `end_time` (timestamptz, nullable) - Session end timestamp
      - `start_latitude` (numeric) - GPS latitude at session start
      - `start_longitude` (numeric) - GPS longitude at session start
      - `end_latitude` (numeric, nullable) - GPS latitude at session end
      - `end_longitude` (numeric, nullable) - GPS longitude at session end
      - `distance_from_customer` (numeric) - Distance in meters from customer location at start
      - `status` (text) - Session status (active/closed)
      - `notes` (text, nullable) - Optional notes
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `sales_sessions` table
    - Add policy for authenticated users to read sessions
    - Add policy for authenticated users to create sessions
    - Add policy for authenticated users to update sessions
    - Add policy for authenticated users to delete sessions

  3. Indexes
    - Index on van_id for van-specific queries
    - Index on customer_id for customer session history
    - Index on status for active session queries
    - Index on start_time for date-based reporting

  4. Constraints
    - Only one active session per van at a time
    - End time must be after start time
*/

-- Create sales_sessions table
CREATE TABLE IF NOT EXISTS sales_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  van_id uuid NOT NULL REFERENCES vans(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  start_latitude numeric NOT NULL,
  start_longitude numeric NOT NULL,
  end_latitude numeric,
  end_longitude numeric,
  distance_from_customer numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_end_time CHECK (end_time IS NULL OR end_time > start_time)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_sessions_van_id ON sales_sessions(van_id);
CREATE INDEX IF NOT EXISTS idx_sales_sessions_customer_id ON sales_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_sessions_status ON sales_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sales_sessions_start_time ON sales_sessions(start_time);

-- Create unique index to ensure only one active session per van
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_sessions_active_van 
  ON sales_sessions(van_id) 
  WHERE status = 'active';

-- Enable Row Level Security
ALTER TABLE sales_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can read sales sessions"
  ON sales_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create sales sessions"
  ON sales_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales sessions"
  ON sales_sessions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales sessions"
  ON sales_sessions FOR DELETE
  TO authenticated
  USING (true);
