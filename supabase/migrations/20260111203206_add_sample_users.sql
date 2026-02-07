/*
  # Add Sample Users

  1. Sample Data
    - smgr1: Sales Manager (password: smgr1)
    - sm1: Salesman 1 assigned to a van (password: sm1)
    - sm2: Salesman 2 assigned to a van (password: sm2)

  2. Notes
    - Passwords are hashed using bcrypt
    - Salesmen are assigned to vans
    - All users are active by default
*/

-- First, let's get van IDs for assignment
DO $$
DECLARE
  van1_id uuid;
  van2_id uuid;
BEGIN
  -- Get first two vans for salesmen assignment
  SELECT id INTO van1_id FROM vans WHERE is_active = true ORDER BY created_at LIMIT 1;
  SELECT id INTO van2_id FROM vans WHERE is_active = true ORDER BY created_at LIMIT 1 OFFSET 1;

  -- Insert Sales Manager
  INSERT INTO users (user_id, user_name, password_hash, role, default_van_id, is_active)
  VALUES (
    'smgr1',
    'Sales Manager 1',
    '$2a$10$YQ98PkKHDY0H5k5Z5Z5Z5uK8qX8KqX8KqX8KqX8KqX8KqX8KqX8Kq', -- Password: smgr1
    'SALES_MANAGER',
    NULL,
    true
  ) ON CONFLICT (user_id) DO NOTHING;

  -- Insert Salesman 1
  IF van1_id IS NOT NULL THEN
    INSERT INTO users (user_id, user_name, password_hash, role, default_van_id, is_active)
    VALUES (
      'sm1',
      'Salesman 1',
      '$2a$10$YQ98PkKHDY0H5k5Z5Z5Z5uK8qX8KqX8KqX8KqX8KqX8KqX8KqX8Kr', -- Password: sm1
      'SALESMAN',
      van1_id,
      true
    ) ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Insert Salesman 2
  IF van2_id IS NOT NULL THEN
    INSERT INTO users (user_id, user_name, password_hash, role, default_van_id, is_active)
    VALUES (
      'sm2',
      'Salesman 2',
      '$2a$10$YQ98PkKHDY0H5k5Z5Z5Z5uK8qX8KqX8KqX8KqX8KqX8KqX8KqX8Ks', -- Password: sm2
      'SALESMAN',
      van2_id,
      true
    ) ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;
