-- Service Account Setup for Agent Service
-- Run this to add the agent service account to the whitelist

-- Add service agent to whitelist
INSERT INTO user_whitelist (user_id, email, created_at)
VALUES ('service-agent', 'agent@local', NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Verify insertion
SELECT * FROM user_whitelist WHERE user_id = 'service-agent';
