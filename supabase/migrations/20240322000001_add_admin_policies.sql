-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all client users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Create a basic policy for users to view their own profile
CREATE POLICY "Users can view own profile"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create a policy for admins to view all users
CREATE POLICY "Admins can view all users"
ON users
FOR SELECT
TO authenticated
USING (
  -- Check if the requesting user has admin role in their JWT claims
  auth.jwt()->>'role' = 'admin'
  OR auth.uid() = id  -- Allow users to view their own profile
); 