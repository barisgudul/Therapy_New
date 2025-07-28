
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


DELETE FROM subscription_plans WHERE name IN ('Free', '+Plus', 'Premium');


INSERT INTO subscription_plans (id, name, price, currency, duration_days, features) VALUES



('f9a429a8-9d7a-4d32-9a59-a5f7b824f9a0', 'Free', 0.00, 'USD', 30, '{
    "daily_write_daily": 1,         
    "diary_write_weekly": 3,       
    "dream_analysis_weekly": 1,    
    "text_sessions": 0,            
    "ai_reports_monthly": 0,       
    "voice_sessions": 0            
}'),




('a1b2c3d4-e5f6-7890-1234-567890abcdef', '+Plus', 19.99, 'USD', 30, '{
    "daily_write_daily": 1,         
    "diary_write_daily": 1,         
    "dream_analysis_weekly": 3,    
    "ai_reports_weekly": 1,        
    "text_sessions": -1,          
    "voice_sessions": 0
}'),




('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'Premium', 99.99, 'USD', 30, '{
    "daily_write_daily": 1,          
    "diary_write_daily": -1,        
    "dream_analysis_daily": -1,    
    "ai_reports_daily": -1,        
    "text_sessions": -1,           
    "voice_sessions": -1           
}');


ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Plans are viewable by everyone" ON subscription_plans
    FOR SELECT USING (true);


CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);


CREATE POLICY "Users can view own usage" ON usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON usage_tracking
    FOR ALL USING (auth.uid() = user_id);


CREATE POLICY "Users can view own payment history" ON payment_history
    FOR SELECT USING (auth.uid() = user_id);


CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_ends_at ON user_subscriptions(ends_at);
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_reset_date ON usage_tracking(reset_date);
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);


CREATE OR REPLACE FUNCTION get_user_current_subscription(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    plan_id UUID,
    name VARCHAR(50),
    status VARCHAR(20),
    current_period_end TIMESTAMP,
    price DECIMAL(10,2),
    currency VARCHAR(3),
    features JSONB,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id,
        sp.id as plan_id,
        sp.name,
        us.status,
        us.ends_at as current_period_end,
        sp.price,
        sp.currency,
        sp.features,
        us.created_at
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid 
    AND us.status = 'active'
    AND us.ends_at > NOW()
    ORDER BY us.ends_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check feature usage - GÜNCELLENDİ: Dinamik reset periyodu
CREATE OR REPLACE FUNCTION check_feature_usage(user_uuid UUID, feature_name_base VARCHAR(50))
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
    actual_feature_name VARCHAR(100);
BEGIN
   
    SELECT * INTO current_subscription FROM get_user_current_subscription(user_uuid) LIMIT 1;
    
    
    IF current_subscription IS NULL THEN
        SELECT features INTO current_subscription FROM subscription_plans WHERE name = 'Free' LIMIT 1;
    END IF;

    
    IF (current_subscription.features ->> (feature_name_base || '_daily')) IS NOT NULL THEN
        actual_feature_name := feature_name_base || '_daily';
        reset_type_value := 'daily';
        reset_date_value := CURRENT_DATE;
        feature_limit := (current_subscription.features ->> actual_feature_name)::INTEGER;
    ELSIF (current_subscription.features ->> (feature_name_base || '_weekly')) IS NOT NULL THEN
        actual_feature_name := feature_name_base || '_weekly';
        reset_type_value := 'weekly';
        reset_date_value := date_trunc('week', CURRENT_DATE)::DATE;
        feature_limit := (current_subscription.features ->> actual_feature_name)::INTEGER;
    ELSIF (current_subscription.features ->> (feature_name_base || '_monthly')) IS NOT NULL THEN
        actual_feature_name := feature_name_base || '_monthly';
        reset_type_value := 'monthly';
        reset_date_value := date_trunc('month', CURRENT_DATE)::DATE;
        feature_limit := (current_subscription.features ->> actual_feature_name)::INTEGER;
    ELSE
        
        RETURN QUERY SELECT false, 0, 0;
        RETURN;
    END IF;
    
    
    IF feature_limit = -1 THEN
        RETURN QUERY SELECT true, 0, -1;
        RETURN;
    END IF;

    IF feature_limit = 0 THEN
        RETURN QUERY SELECT false, 0, 0;
        RETURN;
    END IF;
    
    
    INSERT INTO usage_tracking (user_id, feature_type, used_count, limit_count, reset_date, reset_type)
    VALUES (user_uuid, actual_feature_name, 0, feature_limit, reset_date_value, reset_type_value)
    ON CONFLICT (user_id, feature_type, reset_date) DO NOTHING;
    
    SELECT * INTO usage_record FROM usage_tracking 
    WHERE user_id = user_uuid AND feature_type = actual_feature_name AND reset_date = reset_date_value;
    
    RETURN QUERY SELECT 
        (usage_record.used_count < usage_record.limit_count),
        usage_record.used_count,
        usage_record.limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION increment_feature_usage(user_uuid UUID, feature_name_base VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    reset_date_value DATE;
    usage_check RECORD;
    current_subscription RECORD;
    actual_feature_name VARCHAR(100);
BEGIN
    
    SELECT * INTO usage_check FROM check_feature_usage(user_uuid, feature_name_base) LIMIT 1;
    
    IF NOT usage_check.can_use THEN
        RETURN FALSE;
    END IF;

    
    SELECT * INTO current_subscription FROM get_user_current_subscription(user_uuid) LIMIT 1;
    IF current_subscription IS NULL THEN
        SELECT features INTO current_subscription FROM subscription_plans WHERE name = 'Free' LIMIT 1;
    END IF;
    
    IF (current_subscription.features ->> (feature_name_base || '_daily')) IS NOT NULL THEN
        actual_feature_name := feature_name_base || '_daily';
        reset_date_value := CURRENT_DATE;
    ELSIF (current_subscription.features ->> (feature_name_base || '_weekly')) IS NOT NULL THEN
        actual_feature_name := feature_name_base || '_weekly';
        reset_date_value := date_trunc('week', CURRENT_DATE)::DATE;
    ELSIF (current_subscription.features ->> (feature_name_base || '_monthly')) IS NOT NULL THEN
        actual_feature_name := feature_name_base || '_monthly';
        reset_date_value := date_trunc('month', CURRENT_DATE)::DATE;
    ELSE
        
        RETURN FALSE;
    END IF;

    UPDATE usage_tracking 
    SET used_count = used_count + 1, updated_at = NOW()
    WHERE user_id = user_uuid AND feature_type = actual_feature_name AND reset_date = reset_date_value;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_premium_access(user_uuid UUID, feature_name VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    current_subscription RECORD;
    feature_value JSONB;
BEGIN
    SELECT * INTO current_subscription FROM get_user_current_subscription(user_uuid) LIMIT 1;
    
    IF current_subscription IS NULL THEN
        SELECT features INTO current_subscription FROM subscription_plans WHERE name = 'Free' LIMIT 1;
    END IF;
    

    feature_value := current_subscription.features -> feature_name;
    
    IF feature_value IS NULL THEN
        RETURN FALSE;
    END IF;
    

    IF jsonb_typeof(feature_value) = 'boolean' THEN
        RETURN feature_value::BOOLEAN;
    END IF;
    

    IF jsonb_typeof(feature_value) = 'number' THEN
        RETURN (feature_value::INTEGER) != 0;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION assign_plan_for_user(user_id_to_update UUID, plan_name_to_assign VARCHAR(50))
RETURNS VOID AS $$
DECLARE
    target_plan_id UUID;
    target_plan_duration INTEGER;
BEGIN

    SELECT id, duration_days INTO target_plan_id, target_plan_duration 
    FROM subscription_plans WHERE name = plan_name_to_assign LIMIT 1;

    IF target_plan_id IS NULL THEN
        RAISE EXCEPTION 'Plan not found: %', plan_name_to_assign;
    END IF;

    
    UPDATE user_subscriptions
    SET status = 'cancelled', auto_renew = false, updated_at = NOW()
    WHERE user_id = user_id_to_update AND status = 'active';


    INSERT INTO user_subscriptions (user_id, plan_id, status, starts_at, ends_at, auto_renew)
    VALUES (
        user_id_to_update, 
        target_plan_id, 
        'active', 
        NOW(), 
        NOW() + (target_plan_duration || ' days')::INTERVAL,
        true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION assign_free_plan_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    
    SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'Free' LIMIT 1;
    
    
    INSERT INTO user_subscriptions (user_id, plan_id, status, starts_at, ends_at, auto_renew)
    VALUES (NEW.id, free_plan_id, 'active', NOW(), NOW() + INTERVAL '30 days', false);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER assign_free_plan_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION assign_free_plan_to_new_user();


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

CREATE OR REPLACE FUNCTION get_users_for_trait_analysis(limit_count INT, offset_count INT)
RETURNS TABLE (
    user_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT id::UUID FROM auth.users
    ORDER BY created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 