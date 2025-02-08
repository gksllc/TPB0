-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON appointments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON appointments;
DROP POLICY IF EXISTS "Enable update for users based on role" ON appointments;
DROP POLICY IF EXISTS "Enable delete for users based on role" ON appointments;

-- Create new policies
-- Allow admins to read all appointments
CREATE POLICY "Enable read access for admins"
ON appointments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  OR user_id = auth.uid()
);

-- Allow admins to insert appointments
CREATE POLICY "Enable insert for admins"
ON appointments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  OR user_id = auth.uid()
);

-- Allow admins to update appointments
CREATE POLICY "Enable update for admins"
ON appointments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  OR user_id = auth.uid()
);

-- Allow admins to delete appointments
CREATE POLICY "Enable delete for admins"
ON appointments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  OR user_id = auth.uid()
);

-- Ensure RLS is enabled
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY; 