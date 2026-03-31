-- Add plug_id column to sessions table
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS plug_id TEXT;

-- Add index for plug_id lookups
CREATE INDEX IF NOT EXISTS idx_sessions_plug_id ON sessions(plug_id);

-- Update nearby_sessions function to include plug_id
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
    plug_id TEXT,
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
