-- Premium/Freemium Subscription System
-- Migration: 20241228_subscription_system.sql

-- Subscription Plans tablosu
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',
    duration_days INTEGER NOT NULL,
    features JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User Subscriptions tablosu
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled, trial
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage Tracking tablosu
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_type VARCHAR(50) NOT NULL, -- 'diary_write', 'daily_write', 'dream_analysis'
    used_count INTEGER DEFAULT 0,
    limit_count INTEGER DEFAULT 0,
    reset_date DATE NOT NULL, -- Günlük, haftalık, aylık reset tarihi
    reset_type VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, feature_type, reset_date)
);

-- Payment History tablosu
CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Default Free Plan ekle - SADECE diary, daily_write ve haftada 1 rüya analizi
INSERT INTO subscription_plans (name, price, currency, duration_days, features) VALUES
('Free', 0.00, 'TRY', 30, '{
    "diary_write_daily": 1,
    "daily_write_daily": 1,
    "dream_analysis_weekly": 1,
    "text_sessions": false,
    "voice_sessions": false,
    "video_sessions": false,
    "ai_reports": false,
    "therapist_count": 0,
    "session_history_days": 0,
    "pdf_export": false,
    "priority_support": false
}'),
('Premium', 39.99, 'TRY', 30, '{
    "diary_write_daily": -1,
    "daily_write_daily": -1,
    "dream_analysis_weekly": -1,
    "text_sessions": true,
    "voice_sessions": true,
    "video_sessions": true,
    "ai_reports": true,
    "therapist_count": -1,
    "session_history_days": -1,
    "pdf_export": true,
    "priority_support": true
}');

-- RLS Policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_plans (herkese okunabilir)
CREATE POLICY "Plans are viewable by everyone" ON subscription_plans
    FOR SELECT USING (true);

-- Policies for user_subscriptions (sadece kendi subscription'ını görebilir)
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for usage_tracking (sadece kendi usage'ını görebilir)
CREATE POLICY "Users can view own usage" ON usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON usage_tracking
    FOR ALL USING (auth.uid() = user_id);

-- Policies for payment_history (sadece kendi payment history'sini görebilir)
CREATE POLICY "Users can view own payment history" ON payment_history
    FOR SELECT USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_ends_at ON user_subscriptions(ends_at);
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_reset_date ON usage_tracking(reset_date);
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);

-- Functions for subscription management
CREATE OR REPLACE FUNCTION get_user_current_subscription(user_uuid UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_name VARCHAR(50),
    features JSONB,
    status VARCHAR(20),
    ends_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id,
        sp.name,
        sp.features,
        us.status,
        us.ends_at
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid 
    AND us.status = 'active'
    AND us.ends_at > NOW()
    ORDER BY us.ends_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check feature usage - GÜNCELLENDİ
CREATE OR REPLACE FUNCTION check_feature_usage(user_uuid UUID, feature_name VARCHAR(50))
RETURNS TABLE (
    can_use BOOLEAN,
    used_count INTEGER,
    limit_count INTEGER
) AS $$
DECLARE
    current_subscription RECORD;
    usage_record RECORD;
    feature_limit INTEGER;
    reset_date_value DATE;
    reset_type_value VARCHAR(20);
BEGIN
    -- Reset type'ını belirle
    IF feature_name = 'dream_analysis' THEN
        reset_type_value := 'weekly';
        reset_date_value := date_trunc('week', CURRENT_DATE)::DATE;
    ELSE
        reset_type_value := 'daily';
        reset_date_value := CURRENT_DATE;
    END IF;
    
    -- Get current subscription
    SELECT * INTO current_subscription FROM get_user_current_subscription(user_uuid) LIMIT 1;
    
    -- If no subscription, use free plan
    IF current_subscription IS NULL THEN
        SELECT features INTO current_subscription FROM subscription_plans WHERE name = 'Free' LIMIT 1;
    END IF;
    
    -- Get feature limit from subscription
    IF feature_name = 'dream_analysis' THEN
        feature_limit := (current_subscription.features ->> 'dream_analysis_weekly')::INTEGER;
    ELSE
        feature_limit := (current_subscription.features ->> (feature_name || '_daily'))::INTEGER;
    END IF;
    
    -- -1 means unlimited
    IF feature_limit = -1 THEN
        RETURN QUERY SELECT true, 0, -1;
        RETURN;
    END IF;
    
    -- Get or create usage record
    INSERT INTO usage_tracking (user_id, feature_type, used_count, limit_count, reset_date, reset_type)
    VALUES (user_uuid, feature_name, 0, feature_limit, reset_date_value, reset_type_value)
    ON CONFLICT (user_id, feature_type, reset_date) DO NOTHING;
    
    SELECT * INTO usage_record FROM usage_tracking 
    WHERE user_id = user_uuid AND feature_type = feature_name AND reset_date = reset_date_value;
    
    RETURN QUERY SELECT 
        (usage_record.used_count < usage_record.limit_count),
        usage_record.used_count,
        usage_record.limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage - GÜNCELLENDİ
CREATE OR REPLACE FUNCTION increment_feature_usage(user_uuid UUID, feature_name VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    reset_date_value DATE;
    usage_check RECORD;
BEGIN
    -- Reset date'i belirle
    IF feature_name = 'dream_analysis' THEN
        reset_date_value := date_trunc('week', CURRENT_DATE)::DATE;
    ELSE
        reset_date_value := CURRENT_DATE;
    END IF;
    
    -- Check if user can use this feature
    SELECT * INTO usage_check FROM check_feature_usage(user_uuid, feature_name) LIMIT 1;
    
    IF NOT usage_check.can_use THEN
        RETURN FALSE;
    END IF;
    
    -- Increment usage
    UPDATE usage_tracking 
    SET used_count = used_count + 1, updated_at = NOW()
    WHERE user_id = user_uuid AND feature_type = feature_name AND reset_date = reset_date_value;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has premium access to specific features
CREATE OR REPLACE FUNCTION has_premium_access(user_uuid UUID, feature_name VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    current_subscription RECORD;
    feature_value JSONB;
BEGIN
    -- Get current subscription
    SELECT * INTO current_subscription FROM get_user_current_subscription(user_uuid) LIMIT 1;
    
    -- If no subscription, use free plan
    IF current_subscription IS NULL THEN
        SELECT features INTO current_subscription FROM subscription_plans WHERE name = 'Free' LIMIT 1;
    END IF;
    
    -- Check if feature is enabled (boolean features)
    feature_value := current_subscription.features -> feature_name;
    
    IF feature_value IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- If it's a boolean, return its value
    IF jsonb_typeof(feature_value) = 'boolean' THEN
        RETURN feature_value::BOOLEAN;
    END IF;
    
    -- If it's a number, check if it's not 0
    IF jsonb_typeof(feature_value) = 'number' THEN
        RETURN (feature_value::INTEGER) != 0;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign free plan to new users
CREATE OR REPLACE FUNCTION assign_free_plan_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    -- Get free plan ID
    SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'Free' LIMIT 1;
    
    -- Assign free plan to new user
    INSERT INTO user_subscriptions (user_id, plan_id, status, starts_at, ends_at)
    VALUES (NEW.id, free_plan_id, 'active', NOW(), NOW() + INTERVAL '30 days');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to assign free plan to new users
CREATE TRIGGER assign_free_plan_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION assign_free_plan_to_new_user();

-- Update timestamps triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_history_updated_at BEFORE UPDATE ON payment_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 