-- Create pending_text_sessions table for warm start conversations
CREATE TABLE IF NOT EXISTS pending_text_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    context_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),

    -- Index for efficient lookups
    INDEX idx_pending_text_sessions_user_id (user_id),
    INDEX idx_pending_text_sessions_expires_at (expires_at),

    -- Ensure one pending session per user at a time
    UNIQUE (user_id)
);

-- Add RLS policies
ALTER TABLE pending_text_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own pending sessions
CREATE POLICY "Users can view own pending sessions" ON pending_text_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own pending sessions
CREATE POLICY "Users can insert own pending sessions" ON pending_text_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own pending sessions
CREATE POLICY "Users can delete own pending sessions" ON pending_text_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Policy: Only service role can update (for cleanup)
CREATE POLICY "Service role can update pending sessions" ON pending_text_sessions
    FOR UPDATE USING (auth.role() = 'service_role');

-- Function to cleanup expired sessions (runs every hour)
CREATE OR REPLACE FUNCTION cleanup_expired_pending_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM pending_text_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a cron job to run cleanup every hour
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-pending-sessions', '0 * * * *', 'SELECT cleanup_expired_pending_sessions();');
