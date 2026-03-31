-- Add kwh_delivered column to sessions table
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS kwh_delivered DECIMAL(8,3);

-- Create vehicle_config table
CREATE TABLE IF NOT EXISTS vehicle_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vehicle_name TEXT NOT NULL,
    battery_capacity_kwh DECIMAL(6,2) NOT NULL,
    max_charging_kw DECIMAL(6,2),
    platform_voltage INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index on user_id for vehicle_config
CREATE INDEX IF NOT EXISTS idx_vehicle_config_user_id ON vehicle_config(user_id);

-- Enable RLS on vehicle_config
ALTER TABLE vehicle_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicle_config
CREATE POLICY "Users can view own vehicle config" 
ON vehicle_config FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vehicle config" 
ON vehicle_config FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicle config" 
ON vehicle_config FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicle config" 
ON vehicle_config FOR DELETE 
USING (auth.uid() = user_id);

-- Insert Daniel's Aion V specs as default (will be inserted manually per user)
-- This is a reference: GAC Aion V Luxury, 75.3 kWh, 180 kW max, 400V platform

-- Update nearby_sessions function to include kwh_delivered
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
    failure_type failure_type,
    technique_required BOOLEAN,
    technique_notes TEXT,
    price_per_kwh DECIMAL,
    pin_color pin_color,
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
