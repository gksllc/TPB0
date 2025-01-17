-- Drop the existing primary key constraint
ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS appointments_pkey;

-- Change the id column type from UUID to TEXT
ALTER TABLE appointments
ALTER COLUMN id TYPE TEXT;

-- Recreate the primary key constraint
ALTER TABLE appointments
ADD PRIMARY KEY (id);

-- Add c_order_id column for Clover order IDs
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS c_order_id TEXT;

-- Create an index on c_order_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_c_order_id ON appointments(c_order_id); 