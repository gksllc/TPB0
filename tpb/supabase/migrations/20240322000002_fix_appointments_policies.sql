-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for admins" ON appointments;
DROP POLICY IF EXISTS "Enable insert for admins" ON appointments;
DROP POLICY IF EXISTS "Enable update for admins" ON appointments;
DROP POLICY IF EXISTS "Enable delete for admins" ON appointments;

-- Create new admin policies
CREATE POLICY "Admin full access"
ON appointments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Create policy for users to view their own appointments
CREATE POLICY "Users view own appointments"
ON appointments
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Ensure RLS is enabled
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY; 