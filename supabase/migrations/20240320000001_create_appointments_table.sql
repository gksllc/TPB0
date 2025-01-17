-- Create appointments table if it doesn't exist
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clover_order_id TEXT,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    pet_id UUID REFERENCES pets(id) NOT NULL,
    service_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Confirmed',
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);

-- Create index on pet_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_pet_id ON appointments(pet_id);

-- Create index on appointment_date for faster lookups and sorting
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own appointments
CREATE POLICY "Users can view own appointments"
ON appointments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to insert their own appointments
CREATE POLICY "Users can insert own appointments"
ON appointments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own appointments
CREATE POLICY "Users can update own appointments"
ON appointments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own appointments
CREATE POLICY "Users can delete own appointments"
ON appointments FOR DELETE
TO authenticated
USING (auth.uid() = user_id); 