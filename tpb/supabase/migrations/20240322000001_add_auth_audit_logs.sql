-- Create auth_audit_logs table
CREATE TABLE IF NOT EXISTS auth_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all logs
CREATE POLICY "Allow admins to view all logs" ON auth_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Allow users to view their own logs
CREATE POLICY "Allow users to view their own logs" ON auth_audit_logs
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Only allow system to insert logs
CREATE POLICY "Only system can insert logs" ON auth_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_auth_audit_logs_updated_at
    BEFORE UPDATE ON auth_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_auth_audit_logs_user_id ON auth_audit_logs(user_id);
CREATE INDEX idx_auth_audit_logs_action ON auth_audit_logs(action);
CREATE INDEX idx_auth_audit_logs_timestamp ON auth_audit_logs(timestamp);

-- Add comment
COMMENT ON TABLE auth_audit_logs IS 'Stores audit logs for authentication-related actions'; 