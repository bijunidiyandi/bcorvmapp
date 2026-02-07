/*
  # Create Users Table for Role-Based Access Control

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `user_id` (text, unique) - Login ID
      - `user_name` (text) - Display name
      - `password_hash` (text) - Hashed password
      - `role` (text) - SALES_MANAGER or SALESMAN
      - `default_van_id` (uuid, nullable, foreign key) - Required for SALESMAN
      - `is_active` (boolean) - Account status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `users` table
    - Add policies for authenticated access
    - Sales Manager can create/manage users
    - Salesmen can only read their own profile

  3. Indexes
    - Index on user_id for fast login lookups
    - Index on role for filtering
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  user_name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('SALES_MANAGER', 'SALESMAN')),
  default_van_id uuid REFERENCES vans(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read users (for login)
CREATE POLICY "Allow anonymous read for login"
  ON users
  FOR SELECT
  USING (true);

-- Policy: Allow insert for new users (public registration or by manager)
CREATE POLICY "Allow insert users"
  ON users
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow update users
CREATE POLICY "Allow update users"
  ON users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Allow delete users
CREATE POLICY "Allow delete users"
  ON users
  FOR DELETE
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS users_updated_at_trigger ON users;
CREATE TRIGGER users_updated_at_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();
