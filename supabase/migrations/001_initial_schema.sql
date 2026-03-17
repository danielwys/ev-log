-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    station_name TEXT NOT NULL,
    operator TEXT NOT NULL,
    max_kw DECIMAL(5,2) NOT NULL,
    battery_start INTEGER NOT NULL CHECK (battery_start >= 0 AND battery_start <= 100),
    battery_end INTEGER NOT NULL CHECK (battery_end >= 0 AND battery_end <= 100),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    photos TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for spatial queries
CREATE INDEX IF NOT EXISTS idx_sessions_location 
ON sessions USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id 
ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at 
ON sessions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own sessions" 
ON sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" 
ON sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" 
ON sessions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" 
ON sessions FOR DELETE 
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at 
BEFORE UPDATE ON sessions 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Create function for spatial search
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
