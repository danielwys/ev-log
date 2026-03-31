-- EV Logbook - Vanilla PostgreSQL Schema (PostgREST compatible)
-- This schema replaces Supabase-specific features with standard PostgreSQL

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE failure_type AS ENUM ('handshake', 'derating', 'interruption', 'incompatible', 'other');
CREATE TYPE pin_color AS ENUM ('green', 'yellow', 'red');

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,  -- Google OAuth sub/ID
    user_email TEXT NOT NULL,
    station_name TEXT NOT NULL,
    operator TEXT NOT NULL,
    max_kw DECIMAL(5,2) NOT NULL,
    battery_start DECIMAL(5,1) NOT NULL CHECK (battery_start >= 0 AND battery_start <= 100),
    battery_end DECIMAL(5,1) NOT NULL CHECK (battery_end >= 0 AND battery_end <= 100),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    photos TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- V1 fields
    charger_hardware_model TEXT,
    charger_software TEXT,
    cable_amp_limit INTEGER,
    stall_id TEXT,
    plug_id TEXT,
    connectors_tried TEXT[] DEFAULT '{}',
    successful_connectors TEXT[] DEFAULT '{}',
    attempts INTEGER DEFAULT 1,
    successes INTEGER DEFAULT 0,
    error_code TEXT,
    failure_type failure_type,
    technique_required BOOLEAN DEFAULT FALSE,
    technique_notes TEXT,
    price_per_kwh DECIMAL(6,4),
    pin_color pin_color DEFAULT 'yellow',
    kwh_delivered DECIMAL(8,3)
);

-- Create indexes for spatial queries and performance
CREATE INDEX IF NOT EXISTS idx_sessions_location ON sessions USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_email ON sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_charger_hardware_model ON sessions(charger_hardware_model);
CREATE INDEX IF NOT EXISTS idx_sessions_charger_software ON sessions(charger_software);
CREATE INDEX IF NOT EXISTS idx_sessions_pin_color ON sessions(pin_color);
CREATE INDEX IF NOT EXISTS idx_sessions_plug_id ON sessions(plug_id);

-- Create PlugShare cache table
CREATE TABLE IF NOT EXISTS plugshare_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugshare_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    operator TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plugshare_cache_plugshare_id ON plugshare_cache(plugshare_id);

-- Create user whitelist table (for write access control)
CREATE TABLE IF NOT EXISTS user_whitelist (
    user_id TEXT PRIMARY KEY,  -- Google OAuth sub/ID
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_whitelist_email ON user_whitelist(email);

-- Create vehicle_config table
CREATE TABLE IF NOT EXISTS vehicle_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE,  -- Google OAuth sub/ID
    vehicle_name TEXT NOT NULL,
    battery_capacity_kwh DECIMAL(6,2) NOT NULL,
    max_charging_kw DECIMAL(6,2),
    platform_voltage INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_config_user_id ON vehicle_config(user_id);

-- Create session_images table for optimized image storage
CREATE TABLE IF NOT EXISTS session_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    original_path TEXT NOT NULL,
    webp_path TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    webp_size_bytes INTEGER,
    thumbnail_size_bytes INTEGER,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_images_session_id ON session_images(session_id);
CREATE INDEX IF NOT EXISTS idx_session_images_created_at ON session_images(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_plugshare_cache ON plugshare_cache;
CREATE TRIGGER trigger_update_plugshare_cache
    BEFORE UPDATE ON plugshare_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicle_config_updated_at ON vehicle_config;
CREATE TRIGGER update_vehicle_config_updated_at 
    BEFORE UPDATE ON vehicle_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate pin_color based on success rate
CREATE OR REPLACE FUNCTION calculate_pin_color(p_attempts INTEGER, p_successes INTEGER, p_technique_required BOOLEAN)
RETURNS pin_color AS $$
BEGIN
    IF p_technique_required THEN
        RETURN 'yellow';
    END IF;
    
    IF p_attempts IS NULL OR p_attempts = 0 THEN
        RETURN 'yellow';
    END IF;
    
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

DROP TRIGGER IF EXISTS trigger_update_pin_color ON sessions;
CREATE TRIGGER trigger_update_pin_color
    BEFORE INSERT OR UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_pin_color();

-- Create function for spatial search
CREATE OR REPLACE FUNCTION nearby_sessions(
    search_lat DOUBLE PRECISION,
    search_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 5000
)
RETURNS TABLE (
    id UUID,
    user_id TEXT,
    user_email TEXT,
    station_name TEXT,
    operator TEXT,
    max_kw DECIMAL,
    battery_start DECIMAL,
    battery_end DECIMAL,
    location TEXT,
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
        s.user_email,
        s.station_name,
        s.operator,
        s.max_kw,
        s.battery_start,
        s.battery_end,
        ST_AsText(s.location) as location,
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
        s.failure_type::TEXT,
        s.technique_required,
        s.technique_notes,
        s.price_per_kwh,
        s.pin_color::TEXT,
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
$$ LANGUAGE plpgsql;

-- Create function to check if user is whitelisted
CREATE OR REPLACE FUNCTION is_whitelisted(check_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_whitelist 
        WHERE user_id = check_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- Insert default whitelisted user (Daniel)
INSERT INTO user_whitelist (user_id, email) 
VALUES ('google-oauth2|placeholder', 'me@dawo.me')
ON CONFLICT (email) DO NOTHING;

-- Grant access to postgrest user (will be created by PostgREST)
-- These will be applied after the authenticator user is set up
