-- 订阅积分过期系统
-- 实现订阅积分在订阅取消后自动清零的功能
-- 实现订阅续期时积分重置的功能

-- 1. 为 act_users 表添加订阅相关字段
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_users' AND column_name = 'subscription_status') THEN
        ALTER TABLE act_users ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'cancelled', 'expired'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_users' AND column_name = 'subscription_start_date') THEN
        ALTER TABLE act_users ADD COLUMN subscription_start_date TIMESTAMP NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_users' AND column_name = 'subscription_end_date') THEN
        ALTER TABLE act_users ADD COLUMN subscription_end_date TIMESTAMP NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_users' AND column_name = 'subscription_cancelled_date') THEN
        ALTER TABLE act_users ADD COLUMN subscription_cancelled_date TIMESTAMP NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_users' AND column_name = 'subscription_plan_id') THEN
        ALTER TABLE act_users ADD COLUMN subscription_plan_id VARCHAR(100) NULL;
    END IF;
END $$;

-- 2. 创建订阅状态跟踪表
CREATE TABLE IF NOT EXISTS act_subscription_status (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    subscription_status VARCHAR(20) NOT NULL CHECK (subscription_status IN ('none', 'active', 'cancelled', 'expired')),
    subscription_plan_id VARCHAR(100) NULL,
    subscription_start_date TIMESTAMP NULL,
    subscription_end_date TIMESTAMP NULL,
    subscription_cancelled_date TIMESTAMP NULL,
    credits_at_start INTEGER DEFAULT 0,
    credits_at_cancellation INTEGER DEFAULT 0,
    credits_at_expiry INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES act_users(id) ON DELETE CASCADE
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_act_users_subscription_status ON act_users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_act_users_subscription_end_date ON act_users(subscription_end_date);
CREATE INDEX IF NOT EXISTS idx_act_subscription_status_user_id ON act_subscription_status(user_id);
CREATE INDEX IF NOT EXISTS idx_act_subscription_status_status ON act_subscription_status(subscription_status);
CREATE INDEX IF NOT EXISTS idx_act_subscription_status_end_date ON act_subscription_status(subscription_end_date);

-- 4. 创建函数来更新订阅状态
CREATE OR REPLACE FUNCTION update_subscription_status(
    p_user_id UUID,
    p_status VARCHAR(20),
    p_plan_id VARCHAR(100) DEFAULT NULL,
    p_start_date TIMESTAMP DEFAULT NULL,
    p_end_date TIMESTAMP DEFAULT NULL,
    p_cancelled_date TIMESTAMP DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_credits INTEGER;
BEGIN
    -- 获取用户当前订阅积分
    SELECT subscription_credits INTO v_current_credits
    FROM act_users 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- 更新用户订阅状态
    UPDATE act_users 
    SET 
        subscription_status = p_status,
        subscription_plan_id = COALESCE(p_plan_id, subscription_plan_id),
        subscription_start_date = COALESCE(p_start_date, subscription_start_date),
        subscription_end_date = COALESCE(p_end_date, subscription_end_date),
        subscription_cancelled_date = COALESCE(p_cancelled_date, subscription_cancelled_date)
    WHERE id = p_user_id;
    
    -- 记录订阅状态变更
    INSERT INTO act_subscription_status (
        user_id,
        subscription_status,
        subscription_plan_id,
        subscription_start_date,
        subscription_end_date,
        subscription_cancelled_date,
        credits_at_start,
        credits_at_cancellation,
        credits_at_expiry,
        description
    ) VALUES (
        p_user_id,
        p_status,
        p_plan_id,
        p_start_date,
        p_end_date,
        p_cancelled_date,
        CASE WHEN p_status = 'active' THEN v_current_credits ELSE 0 END,
        CASE WHEN p_status = 'cancelled' THEN v_current_credits ELSE 0 END,
        CASE WHEN p_status = 'expired' THEN v_current_credits ELSE 0 END,
        p_description
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建函数来处理订阅取消
CREATE OR REPLACE FUNCTION cancel_subscription(
    p_user_id UUID,
    p_cancellation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    p_description TEXT DEFAULT '用户取消订阅'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_record RECORD;
    v_subscription_credits INTEGER;
BEGIN
    -- 获取用户当前状态
    SELECT 
        subscription_status,
        subscription_end_date,
        subscription_credits
    INTO v_user_record
    FROM act_users 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    IF v_user_record.subscription_status != 'active' THEN
        RAISE EXCEPTION 'User subscription is not active: %', v_user_record.subscription_status;
    END IF;
    
    -- 更新订阅状态为已取消
    PERFORM update_subscription_status(
        p_user_id,
        'cancelled',
        NULL,
        NULL,
        v_user_record.subscription_end_date,
        p_cancellation_date,
        p_description
    );
    
    -- 订阅积分不会立即清零，会在订阅结束日期后清零
    -- 这里只记录取消状态，积分清零由定时任务处理
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建函数来处理订阅过期（积分清零）
CREATE OR REPLACE FUNCTION expire_subscription_credits(
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_record RECORD;
    v_subscription_credits INTEGER;
BEGIN
    -- 获取用户当前状态
    SELECT 
        subscription_status,
        subscription_credits,
        subscription_end_date
    INTO v_user_record
    FROM act_users 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- 检查是否应该清零积分：订阅已取消且已过期，或者订阅已过期
    IF ((v_user_record.subscription_status = 'cancelled' OR v_user_record.subscription_status = 'active') 
       AND v_user_record.subscription_end_date < CURRENT_TIMESTAMP
       AND v_user_record.subscription_credits > 0) THEN
        
        -- 记录清零前的积分数量
        v_subscription_credits := v_user_record.subscription_credits;
        
        -- 清零订阅积分
        UPDATE act_users 
        SET 
            subscription_credits = 0,
            credits_balance = recharge_credits,
            subscription_status = CASE 
                WHEN v_user_record.subscription_status = 'cancelled' THEN 'expired'
                ELSE 'expired'
            END
        WHERE id = p_user_id;
        
        -- 记录积分清零交易
        INSERT INTO act_credit_transactions (
            user_id,
            transaction_type,
            credits_amount,
            balance_before,
            balance_after,
            description,
            reference_id,
            credit_type,
            subscription_credits_before,
            subscription_credits_after,
            recharge_credits_before,
            recharge_credits_after
        ) VALUES (
            p_user_id,
            'expiry',
            -v_subscription_credits,
            v_user_record.subscription_credits + (SELECT recharge_credits FROM act_users WHERE id = p_user_id),
            (SELECT recharge_credits FROM act_users WHERE id = p_user_id),
            '订阅积分过期清零',
            'expiry_' || p_user_id::text || '_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text,
            'subscription',
            v_subscription_credits,
            0,
            (SELECT recharge_credits FROM act_users WHERE id = p_user_id),
            (SELECT recharge_credits FROM act_users WHERE id = p_user_id)
        );
        
        -- 更新订阅状态为已过期
        PERFORM update_subscription_status(
            p_user_id,
            'expired',
            NULL,
            NULL,
            v_user_record.subscription_end_date,
            NULL,
            '订阅积分已过期清零'
        );
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建函数来批量处理过期的订阅
CREATE OR REPLACE FUNCTION process_expired_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    v_user_record RECORD;
    v_processed_count INTEGER := 0;
BEGIN
    -- 查找所有需要处理过期积分的用户
    FOR v_user_record IN 
        SELECT id, subscription_credits, subscription_end_date, subscription_status
        FROM act_users 
        WHERE (subscription_status = 'cancelled' OR subscription_status = 'active')
          AND subscription_end_date < CURRENT_TIMESTAMP
          AND subscription_credits > 0
    LOOP
        -- 处理每个用户的过期积分
        IF expire_subscription_credits(v_user_record.id) THEN
            v_processed_count := v_processed_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建函数来处理订阅续期（积分重置）
CREATE OR REPLACE FUNCTION renew_subscription_credits(
    p_user_id UUID,
    p_plan_id VARCHAR(100),
    p_credits_amount INTEGER,
    p_start_date TIMESTAMP,
    p_end_date TIMESTAMP,
    p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_record RECORD;
    v_old_subscription_credits INTEGER;
BEGIN
    -- 获取用户当前状态
    SELECT 
        subscription_credits,
        subscription_status,
        recharge_credits
    INTO v_user_record
    FROM act_users 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- 记录重置前的积分数量
    v_old_subscription_credits := v_user_record.subscription_credits;
    
    -- 重置订阅积分为新套餐的积分数量
    UPDATE act_users 
    SET 
        subscription_credits = p_credits_amount,
        credits_balance = p_credits_amount + recharge_credits,
        subscription_status = 'active',
        subscription_plan_id = p_plan_id,
        subscription_start_date = p_start_date,
        subscription_end_date = p_end_date,
        subscription_cancelled_date = NULL
    WHERE id = p_user_id;
    
    -- 记录订阅状态
    PERFORM update_subscription_status(
        p_user_id,
        'active',
        p_plan_id,
        p_start_date,
        p_end_date,
        NULL,
        p_description || ' - 订阅续期积分重置'
    );
    
    -- 记录积分重置交易
    INSERT INTO act_credit_transactions (
        user_id,
        transaction_type,
        credits_amount,
        balance_before,
        balance_after,
        description,
        reference_id,
        credit_type,
        subscription_credits_before,
        subscription_credits_after,
        recharge_credits_before,
        recharge_credits_after
    ) VALUES (
        p_user_id,
        'subscription_renewal',
        p_credits_amount - v_old_subscription_credits,
        v_old_subscription_credits + v_user_record.recharge_credits,
        p_credits_amount + v_user_record.recharge_credits,
        p_description || ' - 订阅续期积分重置',
        'renewal_' || p_plan_id || '_' || p_user_id::text || '_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text,
        'subscription',
        v_old_subscription_credits,
        p_credits_amount,
        v_user_record.recharge_credits,
        v_user_record.recharge_credits
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 9. 创建视图来查看即将过期的订阅
CREATE OR REPLACE VIEW act_expiring_subscriptions AS
SELECT 
    u.id,
    u.email,
    u.subscription_status,
    u.subscription_plan_id,
    u.subscription_start_date,
    u.subscription_end_date,
    u.subscription_cancelled_date,
    u.subscription_credits,
    u.recharge_credits,
    u.credits_balance,
    CASE 
        WHEN u.subscription_status = 'cancelled' AND u.subscription_end_date < CURRENT_TIMESTAMP THEN '已过期'
        WHEN u.subscription_status = 'cancelled' AND u.subscription_end_date >= CURRENT_TIMESTAMP THEN '即将过期'
        WHEN u.subscription_status = 'active' AND u.subscription_end_date < CURRENT_TIMESTAMP THEN '已过期'
        WHEN u.subscription_status = 'active' AND u.subscription_end_date >= CURRENT_TIMESTAMP THEN '活跃'
        ELSE '其他'
    END as expiry_status,
    CASE 
        WHEN u.subscription_status = 'cancelled' AND u.subscription_end_date < CURRENT_TIMESTAMP THEN 0
        WHEN u.subscription_status = 'cancelled' AND u.subscription_end_date >= CURRENT_TIMESTAMP THEN 
            EXTRACT(EPOCH FROM (u.subscription_end_date - CURRENT_TIMESTAMP)) / 86400
        WHEN u.subscription_status = 'active' AND u.subscription_end_date < CURRENT_TIMESTAMP THEN 0
        WHEN u.subscription_status = 'active' AND u.subscription_end_date >= CURRENT_TIMESTAMP THEN 
            EXTRACT(EPOCH FROM (u.subscription_end_date - CURRENT_TIMESTAMP)) / 86400
        ELSE NULL
    END as days_until_expiry
FROM act_users u
WHERE u.subscription_status IN ('active', 'cancelled', 'expired')
ORDER BY u.subscription_end_date ASC;

-- 10. 创建定时任务函数（需要手动调用或通过外部调度器）
CREATE OR REPLACE FUNCTION daily_subscription_cleanup()
RETURNS TEXT AS $$
DECLARE
    v_processed_count INTEGER;
    v_result TEXT;
BEGIN
    -- 处理过期的订阅积分
    v_processed_count := process_expired_subscriptions();
    
    v_result := 'Daily subscription cleanup completed. Processed ' || v_processed_count || ' expired subscriptions.';
    
    -- 记录清理日志
    INSERT INTO act_credit_transactions (
        user_id,
        transaction_type,
        credits_amount,
        balance_before,
        balance_after,
        description,
        reference_id,
        credit_type
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', -- 系统用户ID
        'system_cleanup',
        0,
        0,
        0,
        v_result,
        'daily_cleanup_' || CURRENT_DATE::text,
        'system'
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 11. 更新积分更新API逻辑，支持订阅状态管理
-- 这个函数需要在应用代码中调用
CREATE OR REPLACE FUNCTION add_subscription_credits(
    p_user_id UUID,
    p_credits_to_add INTEGER,
    p_plan_id VARCHAR(100),
    p_start_date TIMESTAMP,
    p_end_date TIMESTAMP,
    p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_record RECORD;
    v_is_renewal BOOLEAN := FALSE;
BEGIN
    -- 获取用户当前积分状态
    SELECT subscription_credits, recharge_credits, subscription_status, subscription_end_date
    INTO v_user_record
    FROM act_users 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- 检查是否为续期（用户已有活跃订阅且新订阅开始日期在当前订阅结束日期之后）
    IF v_user_record.subscription_status = 'active' 
       AND v_user_record.subscription_end_date IS NOT NULL 
       AND p_start_date > v_user_record.subscription_end_date THEN
        v_is_renewal := TRUE;
    END IF;
    
    IF v_is_renewal THEN
        -- 处理订阅续期（重置积分）
        RETURN renew_subscription_credits(
            p_user_id,
            p_plan_id,
            p_credits_to_add,
            p_start_date,
            p_end_date,
            p_description
        );
    ELSE
        -- 处理新订阅或订阅更新（累加积分）
        UPDATE act_users 
        SET 
            subscription_credits = subscription_credits + p_credits_to_add,
            credits_balance = subscription_credits + p_credits_to_add + recharge_credits,
            subscription_status = 'active',
            subscription_plan_id = p_plan_id,
            subscription_start_date = p_start_date,
            subscription_end_date = p_end_date,
            subscription_cancelled_date = NULL
        WHERE id = p_user_id;
        
        -- 记录订阅状态
        PERFORM update_subscription_status(
            p_user_id,
            'active',
            p_plan_id,
            p_start_date,
            p_end_date,
            NULL,
            p_description || ' - 订阅积分添加'
        );
        
        -- 记录交易历史
        INSERT INTO act_credit_transactions (
            user_id,
            transaction_type,
            credits_amount,
            balance_before,
            balance_after,
            description,
            reference_id,
            credit_type,
            subscription_credits_before,
            subscription_credits_after,
            recharge_credits_before,
            recharge_credits_after
        ) VALUES (
            p_user_id,
            'subscription_purchase',
            p_credits_to_add,
            v_user_record.subscription_credits + v_user_record.recharge_credits,
            v_user_record.subscription_credits + v_user_record.recharge_credits + p_credits_to_add,
            p_description,
            'subscription_' || p_plan_id || '_' || p_user_id::text,
            'subscription',
            v_user_record.subscription_credits,
            v_user_record.subscription_credits + p_credits_to_add,
            v_user_record.recharge_credits,
            v_user_record.recharge_credits
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 12. 验证更新
SELECT 
    'Subscription expiry system created successfully' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_subscriptions,
    COUNT(CASE WHEN subscription_status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
    COUNT(CASE WHEN subscription_status = 'expired' THEN 1 END) as expired_subscriptions,
    SUM(subscription_credits) as total_subscription_credits,
    SUM(recharge_credits) as total_recharge_credits
FROM act_users; 