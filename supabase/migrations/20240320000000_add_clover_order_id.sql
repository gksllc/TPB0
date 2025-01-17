-- Add clover_order_id column to appointments table
ALTER TABLE appointments ADD COLUMN clover_order_id TEXT;

-- Create an index on clover_order_id for faster lookups
CREATE INDEX idx_appointments_clover_order_id ON appointments(clover_order_id);

-- Add a comment to describe the column
COMMENT ON COLUMN appointments.clover_order_id IS 'The ID of the corresponding order in the Clover system'; 