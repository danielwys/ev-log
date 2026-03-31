-- PostgREST Role Setup
-- This creates the necessary roles for PostgREST authentication

-- Create authenticator role (used by PostgREST to switch between roles)
-- Note: Password should match your JWT setup
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'your-authenticator-password';
  END IF;
END
$$;

-- Create anonymous role for unauthenticated users (read-only)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'web_anon') THEN
    CREATE ROLE web_anon NOINHERIT;
  END IF;
END
$$;

-- Grant web_anon access to public schema
GRANT USAGE ON SCHEMA public TO web_anon;

-- Grant SELECT on sessions table (public read)
GRANT SELECT ON sessions TO web_anon;

-- Grant SELECT on plugshare_cache table (public read)
GRANT SELECT ON plugshare_cache TO web_anon;

-- Grant web_anon to authenticator so it can switch to it
GRANT web_anon TO authenticator;

-- Create authenticated role for logged-in users
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOINHERIT;
  END IF;
END
$$;

-- Grant authenticated access to public schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant SELECT on sessions table (authenticated can read)
GRANT SELECT ON sessions TO authenticated;

-- Grant INSERT, UPDATE, DELETE on sessions for authenticated users
GRANT INSERT, UPDATE, DELETE ON sessions TO authenticated;

-- Grant ALL on plugshare_cache for authenticated users (can insert/update)
GRANT ALL ON plugshare_cache TO authenticated;

-- Grant ALL on user_whitelist for authenticated users (read-only for checking)
GRANT SELECT ON user_whitelist TO authenticated;

-- Grant ALL on vehicle_config for authenticated users
GRANT ALL ON vehicle_config TO authenticated;

-- Grant authenticated to authenticator so it can switch to it
GRANT authenticated TO authenticator;

-- Note: For production, you would also set up JWT token validation
-- The authenticator role switches to web_anon or authenticated based on JWT claims
-- The JWT role claim should map to the correct role

-- Grant sequence permissions (needed for INSERT operations)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO web_anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable location-based queries via function
GRANT EXECUTE ON FUNCTION nearby_sessions(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO web_anon;
GRANT EXECUTE ON FUNCTION nearby_sessions(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

GRANT EXECUTE ON FUNCTION is_whitelisted(TEXT) TO authenticated;