-- Create PlugShare cache table
CREATE TABLE IF NOT EXISTS plugshare_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugshare_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    operator TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_plugshare_cache_plugshare_id ON plugshare_cache(plugshare_id);

-- Enable RLS
ALTER TABLE plugshare_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cache
CREATE POLICY "Anyone can read plugshare cache" 
ON plugshare_cache FOR SELECT 
USING (true);

-- Allow authenticated users to insert/update cache
CREATE POLICY "Authenticated users can insert cache" 
ON plugshare_cache FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cache" 
ON plugshare_cache FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_plugshare_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_plugshare_cache ON plugshare_cache;
CREATE TRIGGER trigger_update_plugshare_cache
    BEFORE UPDATE ON plugshare_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_plugshare_cache_timestamp();
