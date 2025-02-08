-- Drop existing policies
DROP POLICY IF EXISTS "Admin full access" ON appointments;
DROP POLICY IF EXISTS "Users view own appointments" ON appointments;

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for appointments
CREATE POLICY "Enable read access for all authenticated users"
ON appointments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON appointments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON appointments FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete for authenticated users"
ON appointments FOR DELETE
TO authenticated
USING (true);

-- Ensure foreign key relationships are correct
DO $$ BEGIN
    ALTER TABLE appointments
    DROP CONSTRAINT IF EXISTS appointments_pet_id_fkey;
    
    ALTER TABLE appointments
    ADD CONSTRAINT appointments_pet_id_fkey
    FOREIGN KEY (pet_id)
    REFERENCES pets(id)
    ON DELETE CASCADE;
    
    ALTER TABLE appointments
    DROP CONSTRAINT IF EXISTS appointments_user_id_fkey;
    
    ALTER TABLE appointments
    ADD CONSTRAINT appointments_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE;
EXCEPTION
    WHEN others THEN
    NULL;
END $$; 