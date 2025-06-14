-- Add Authentication Columns to Users Table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS hashed_password TEXT,
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{"developer"}',
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{"view_project","view_epic","create_story","edit_story","view_story","use_ai_features"}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS team_id UUID;

-- Update existing users with default values
UPDATE users SET roles = '{"developer"}' WHERE roles IS NULL;
UPDATE users SET permissions = '{"view_project","view_epic","create_story","edit_story","view_story","use_ai_features"}' WHERE permissions IS NULL;
UPDATE users SET is_active = true WHERE is_active IS NULL;
UPDATE users SET is_verified = false WHERE is_verified IS NULL;

-- Grant permissions
GRANT ALL ON users TO postgres, anon, authenticated, service_role;