-- Create failure_type enum
CREATE TYPE failure_type AS ENUM ('handshake', 'derating', 'interruption', 'incompatible', 'other');

-- Create pin_color enum
CREATE TYPE pin_color AS ENUM ('green', 'yellow', 'red');

-- Add new columns to sessions table
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS charger_hardware_model TEXT,
    ADD COLUMN IF NOT EXISTS charger_software TEXT,
    ADD COLUMN IF NOT EXISTS cable_amp_limit INTEGER,
    ADD COLUMN IF NOT EXISTS stall_id TEXT,
    ADD COLUMN IF NOT EXISTS connectors_tried TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS successful_connectors TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS successes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS error_code TEXT,
    ADD COLUMN IF NOT EXISTS failure_type failure_type,
    ADD COLUMN IF NOT EXISTS technique_required BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS technique_notes TEXT,
    ADD COLUMN IF NOT EXISTS price_per_kwh DECIMAL(6,4),
    ADD COLUMN IF NOT EXISTS pin_color pin_color DEFAULT 'yellow';

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_sessions_charger_hardware_model ON sessions(charger_hardware_model);
CREATE INDEX IF NOT EXISTS idx_sessions_charger_software ON sessions(charger_software);
CREATE INDEX IF NOT EXISTS idx_sessions_pin_color ON sessions(pin_color);

-- Update nearby_sessions function to include new fields
DROP FUNCTION IF EXISTS nearby_sessions(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);

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
    battery_start INTEGER,
    battery_end INTEGER,
    location GEOGRAPHY,
    photos TEXT[],
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    charger_hardware_model TEXT,
    charger_software TEXT,
    cable_amp_limit INTEGER,
    stall_id TEXT,
    connectors_tried TEXT[],
    successful_connectors TEXT[],
    attempts INTEGER,
    successes INTEGER,
    error_code TEXT,
    failure_type failure_type,
    technique_required BOOLEAN,
    technique_notes TEXT,
    price_per_kwh DECIMAL,
    pin_color pin_color,
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

-- Update RLS policies to allow public read access
-- Drop old policies that restrict to own sessions only
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;

-- Create new policies
-- Allow anyone to view sessions (public read)
CREATE POLICY "Anyone can view sessions" 
ON sessions FOR SELECT 
USING (true);

-- Keep write policies restricted to authenticated users
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;

CREATE POLICY "Users can insert own sessions" 
ON sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" 
ON sessions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" 
ON sessions FOR DELETE 
USING (auth.uid() = user_id);

-- Create a function to calculate pin_color based on success rate
CREATE OR REPLACE FUNCTION calculate_pin_color(p_attempts INTEGER, p_successes INTEGER, p_technique_required BOOLEAN)
RETURNS pin_color AS $$
BEGIN
    -- If technique is required, always yellow (caution)
    IF p_technique_required THEN
        RETURN 'yellow';
    END IF;
    
    -- No attempts or no data, default to yellow
    IF p_attempts IS NULL OR p_attempts = 0 THEN
        RETURN 'yellow';
    END IF;
    
    -- Calculate success rate
    DECLARE
        success_rate DECIMAL := p_successes::DECIMAL / p_attempts;
    BEGIN
        IF success_rate > 0.75 OR p_successes = p_attempts THEN
            RETURN 'green';
        ELSIF success_rate >= 0.25 THEN
            RETURN 'yellow';
        ELSE
            RETURN 'red';
        END IF;
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to auto-calculate pin_color
CREATE OR REPLACE FUNCTION update_pin_color()
RETURNS TRIGGER AS $$
BEGIN
    NEW.pin_color = calculate_pin_color(NEW.attempts, NEW.successes, NEW.technique_required);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_pin_color ON sessions;

-- Create trigger
CREATE TRIGGER trigger_update_pin_color
    BEFORE INSERT OR UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_pin_color();
