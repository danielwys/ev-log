-- Create user_whitelist table
CREATE TABLE IF NOT EXISTS user_whitelist (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on whitelist table
ALTER TABLE user_whitelist ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_whitelist
-- Public can read whitelist (needed for checking if user can edit)
CREATE POLICY "Public can view whitelist"
ON user_whitelist FOR SELECT
TO PUBLIC
USING (true);

-- Only authenticated users can check their own whitelist status (via a function)
-- Actual insert/delete restricted to service role or manual admin access

-- Create function to check if user is whitelisted (for use in other policies)
CREATE OR REPLACE FUNCTION is_whitelisted(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_whitelist 
        WHERE user_id = check_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing sessions RLS policies
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;

-- New RLS policies for sessions
-- SELECT: Allow public (no auth required) to view all sessions
CREATE POLICY "Public can view all sessions"
ON sessions FOR SELECT
TO PUBLIC
USING (true);

-- INSERT: Only whitelisted users can insert
CREATE POLICY "Whitelisted users can insert sessions"
ON sessions FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id 
    AND is_whitelisted(auth.uid())
);

-- UPDATE: Only whitelisted users can update their own sessions
CREATE POLICY "Whitelisted users can update own sessions"
ON sessions FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id 
    AND is_whitelisted(auth.uid())
)
WITH CHECK (
    auth.uid() = user_id 
    AND is_whitelisted(auth.uid())
);

-- DELETE: Only whitelisted users can delete their own sessions
CREATE POLICY "Whitelisted users can delete own sessions"
ON sessions FOR DELETE
TO authenticated
USING (
    auth.uid() = user_id 
    AND is_whitelisted(auth.uid())
);

-- Update the nearby_sessions function to include all fields and work for public access
CREATE OR REPLACE FUNCTION nearby_sessions(
    search_lat DOUBLE PRECISION,
    search_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 5000
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    station_name TEXT,
    operator TEXT,
    max_kw DECIMAL,
    battery_start DECIMAL,
    battery_end DECIMAL,
    location GEOGRAPHY,
    photos TEXT[],
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    charger_hardware_model TEXT,
    charger_software TEXT,
    cable_amp_limit INTEGER,
    stall_id TEXT,
    plug_id TEXT,
    connectors_tried TEXT[],
    successful_connectors TEXT[],
    attempts INTEGER,
    successes INTEGER,
    error_code TEXT,
    failure_type TEXT,
    technique_required BOOLEAN,
    technique_notes TEXT,
    price_per_kwh DECIMAL,
    pin_color TEXT,
    kwh_delivered DECIMAL,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        s.station_name,
        s.operator,
        s.max_kw,
        s.battery_start,
        s.battery_end,
        s.location,
        s.photos,
        s.notes,
        s.created_at,
        s.updated_at,
        s.charger_hardware_model,
        s.charger_software,
        s.cable_amp_limit,
        s.stall_id,
        s.plug_id,
        s.connectors_tried,
        s.successful_connectors,
        s.attempts,
        s.successes,
        s.error_code,
        s.failure_type,
        s.technique_required,
        s.technique_notes,
        s.price_per_kwh,
        s.pin_color,
        s.kwh_delivered,
        ST_Distance(s.location, ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography) AS distance_meters
    FROM sessions s
    WHERE ST_DWithin(
        s.location,
        ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
        radius_meters
    )
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
