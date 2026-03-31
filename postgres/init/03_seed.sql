-- Seed data for development/testing
-- Add the default whitelisted user

-- Insert whitelisted user (Daniel)
-- Note: user_id will be replaced by actual Google OAuth sub after first login
-- For now, we use a placeholder that can be updated later

INSERT INTO user_whitelist (user_id, email) 
VALUES ('placeholder-google-oauth-sub', 'me@dawo.me')
ON CONFLICT (email) DO NOTHING;

-- You can add more whitelisted users here:
-- INSERT INTO user_whitelist (user_id, email) VALUES ('placeholder', 'another@example.com');