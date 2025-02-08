-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all users
CREATE POLICY "admins_view_all_users" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Policy for users to view their own data
CREATE POLICY "users_view_own_data" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
  ); 