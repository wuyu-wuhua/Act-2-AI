-- 更新积分系统：分离订阅积分和充值积分
-- 执行前请备份数据库

-- 1. 为 act_users 表添加新的积分字段
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_users' AND column_name = 'subscription_credits') THEN
        ALTER TABLE act_users ADD COLUMN subscription_credits INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_users' AND column_name = 'recharge_credits') THEN
        ALTER TABLE act_users ADD COLUMN recharge_credits INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. 更新现有用户的积分分配
-- 假设现有积分都是充值积分（因为之前没有订阅系统）
UPDATE act_users 
SET recharge_credits = credits_balance 
WHERE credits_balance > 0;

-- 3. 为 act_credit_transactions 表添加积分类型字段
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_credit_transactions' AND column_name = 'credit_type') THEN
        ALTER TABLE act_credit_transactions ADD COLUMN credit_type VARCHAR(20) DEFAULT 'recharge' CHECK (credit_type IN ('subscription', 'recharge'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_credit_transactions' AND column_name = 'subscription_credits_before') THEN
        ALTER TABLE act_credit_transactions ADD COLUMN subscription_credits_before INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_credit_transactions' AND column_name = 'subscription_credits_after') THEN
        ALTER TABLE act_credit_transactions ADD COLUMN subscription_credits_after INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_credit_transactions' AND column_name = 'recharge_credits_before') THEN
        ALTER TABLE act_credit_transactions ADD COLUMN recharge_credits_before INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_credit_transactions' AND column_name = 'recharge_credits_after') THEN
        ALTER TABLE act_credit_transactions ADD COLUMN recharge_credits_after INTEGER DEFAULT 0;
    END IF;
END $$;

-- 4. 为 act_credit_purchases 表添加积分类型字段
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_credit_purchases' AND column_name = 'credit_type') THEN
        ALTER TABLE act_credit_purchases ADD COLUMN credit_type VARCHAR(20) DEFAULT 'recharge' CHECK (credit_type IN ('subscription', 'recharge'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_credit_purchases' AND column_name = 'subscription_credits_before') THEN
        ALTER TABLE act_credit_purchases ADD COLUMN subscription_credits_before INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_credit_purchases' AND column_name = 'subscription_credits_after') THEN
        ALTER TABLE act_credit_purchases ADD COLUMN subscription_credits_after INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_credit_purchases' AND column_name = 'recharge_credits_before') THEN
        ALTER TABLE act_credit_purchases ADD COLUMN recharge_credits_before INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_credit_purchases' AND column_name = 'recharge_credits_after') THEN
        ALTER TABLE act_credit_purchases ADD COLUMN recharge_credits_after INTEGER DEFAULT 0;
    END IF;
END $$;

-- 5. 创建积分消耗记录表
CREATE TABLE IF NOT EXISTS act_credit_consumption (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    consumption_type VARCHAR(20) NOT NULL CHECK (consumption_type IN ('subscription', 'recharge')),
    credits_consumed INTEGER NOT NULL,
    subscription_credits_before INTEGER NOT NULL,
    subscription_credits_after INTEGER NOT NULL,
    recharge_credits_before INTEGER NOT NULL,
    recharge_credits_after INTEGER NOT NULL,
    total_credits_before INTEGER NOT NULL,
    total_credits_after INTEGER NOT NULL,
    description TEXT,
    generation_id VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES act_users(id) ON DELETE CASCADE
);

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS idx_act_users_subscription_credits ON act_users(subscription_credits);
CREATE INDEX IF NOT EXISTS idx_act_users_recharge_credits ON act_users(recharge_credits);
CREATE INDEX IF NOT EXISTS idx_act_credit_transactions_credit_type ON act_credit_transactions(credit_type);
CREATE INDEX IF NOT EXISTS idx_act_credit_purchases_credit_type ON act_credit_purchases(credit_type);
CREATE INDEX IF NOT EXISTS idx_act_credit_consumption_user_id ON act_credit_consumption(user_id);
CREATE INDEX IF NOT EXISTS idx_act_credit_consumption_type ON act_credit_consumption(consumption_type);
CREATE INDEX IF NOT EXISTS idx_act_credit_consumption_created_at ON act_credit_consumption(created_at);

-- 7. 创建视图来计算总积分
CREATE OR REPLACE VIEW act_user_total_credits AS
SELECT 
    id,
    email,
    subscription_credits,
    recharge_credits,
    (subscription_credits + recharge_credits) as total_credits,
    created_at
FROM act_users;

-- 8. 创建函数来消耗积分（优先消耗订阅积分）
CREATE OR REPLACE FUNCTION consume_credits(
    p_user_id UUID,
    p_credits_to_consume INTEGER,
    p_description TEXT DEFAULT NULL,
    p_generation_id VARCHAR(100) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_record RECORD;
    v_remaining_credits INTEGER;
    v_subscription_consumed INTEGER := 0;
    v_recharge_consumed INTEGER := 0;
BEGIN
    -- 获取用户当前积分状态
    SELECT subscription_credits, recharge_credits 
    INTO v_user_record
    FROM act_users 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- 检查总积分是否足够
    IF (v_user_record.subscription_credits + v_user_record.recharge_credits) < p_credits_to_consume THEN
        RETURN FALSE;
    END IF;
    
    -- 优先消耗订阅积分
    IF v_user_record.subscription_credits >= p_credits_to_consume THEN
        -- 订阅积分足够
        v_subscription_consumed := p_credits_to_consume;
        v_recharge_consumed := 0;
    ELSE
        -- 订阅积分不够，先消耗完订阅积分，再消耗充值积分
        v_subscription_consumed := v_user_record.subscription_credits;
        v_remaining_credits := p_credits_to_consume - v_subscription_consumed;
        v_recharge_consumed := v_remaining_credits;
    END IF;
    
    -- 更新用户积分
    UPDATE act_users 
    SET 
        subscription_credits = subscription_credits - v_subscription_consumed,
        recharge_credits = recharge_credits - v_recharge_consumed,
        credits_balance = subscription_credits - v_subscription_consumed + recharge_credits - v_recharge_consumed
    WHERE id = p_user_id;
    
    -- 记录消耗记录
    INSERT INTO act_credit_consumption (
        user_id,
        consumption_type,
        credits_consumed,
        subscription_credits_before,
        subscription_credits_after,
        recharge_credits_before,
        recharge_credits_after,
        total_credits_before,
        total_credits_after,
        description,
        generation_id
    ) VALUES (
        p_user_id,
        CASE 
            WHEN v_subscription_consumed > 0 AND v_recharge_consumed > 0 THEN 'subscription'
            WHEN v_subscription_consumed > 0 THEN 'subscription'
            ELSE 'recharge'
        END,
        p_credits_to_consume,
        v_user_record.subscription_credits,
        v_user_record.subscription_credits - v_subscription_consumed,
        v_user_record.recharge_credits,
        v_user_record.recharge_credits - v_recharge_consumed,
        v_user_record.subscription_credits + v_user_record.recharge_credits,
        (v_user_record.subscription_credits - v_subscription_consumed) + (v_user_record.recharge_credits - v_recharge_consumed),
        p_description,
        p_generation_id
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
        'consumption',
        -p_credits_to_consume,
        v_user_record.subscription_credits + v_user_record.recharge_credits,
        (v_user_record.subscription_credits - v_subscription_consumed) + (v_user_record.recharge_credits - v_recharge_consumed),
        p_description,
        p_generation_id,
        CASE 
            WHEN v_subscription_consumed > 0 AND v_recharge_consumed > 0 THEN 'subscription'
            WHEN v_subscription_consumed > 0 THEN 'subscription'
            ELSE 'recharge'
        END,
        v_user_record.subscription_credits,
        v_user_record.subscription_credits - v_subscription_consumed,
        v_user_record.recharge_credits,
        v_user_record.recharge_credits - v_recharge_consumed
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 9. 创建函数来添加积分
CREATE OR REPLACE FUNCTION add_credits(
    p_user_id UUID,
    p_credits_to_add INTEGER,
    p_credit_type VARCHAR(20),
    p_description TEXT DEFAULT NULL,
    p_reference_id VARCHAR(100) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_record RECORD;
BEGIN
    -- 获取用户当前积分状态
    SELECT subscription_credits, recharge_credits 
    INTO v_user_record
    FROM act_users 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- 根据积分类型更新对应字段
    IF p_credit_type = 'subscription' THEN
        UPDATE act_users 
        SET 
            subscription_credits = subscription_credits + p_credits_to_add,
            credits_balance = subscription_credits + p_credits_to_add + recharge_credits
        WHERE id = p_user_id;
    ELSE
        UPDATE act_users 
        SET 
            recharge_credits = recharge_credits + p_credits_to_add,
            credits_balance = subscription_credits + recharge_credits + p_credits_to_add
        WHERE id = p_user_id;
    END IF;
    
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
        CASE 
            WHEN p_credit_type = 'subscription' THEN 'subscription_purchase'
            ELSE 'purchase'
        END,
        p_credits_to_add,
        v_user_record.subscription_credits + v_user_record.recharge_credits,
        v_user_record.subscription_credits + v_user_record.recharge_credits + p_credits_to_add,
        p_description,
        p_reference_id,
        p_credit_type,
        v_user_record.subscription_credits,
        CASE WHEN p_credit_type = 'subscription' THEN v_user_record.subscription_credits + p_credits_to_add ELSE v_user_record.subscription_credits END,
        v_user_record.recharge_credits,
        CASE WHEN p_credit_type = 'recharge' THEN v_user_record.recharge_credits + p_credits_to_add ELSE v_user_record.recharge_credits END
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10. 更新现有交易记录的积分类型
-- 将所有现有的购买记录标记为充值积分
UPDATE act_credit_transactions 
SET credit_type = 'recharge'
WHERE transaction_type IN ('purchase', 'subscription_purchase', 'bonus');

-- 更新现有购买记录的积分类型
UPDATE act_credit_purchases 
SET credit_type = 'recharge'
WHERE transaction_type IN ('purchase', 'subscription');

-- 11. 创建触发器来自动更新总积分
CREATE OR REPLACE FUNCTION update_total_credits()
RETURNS TRIGGER AS $$
BEGIN
    NEW.credits_balance = NEW.subscription_credits + NEW.recharge_credits;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除可能存在的旧触发器
DROP TRIGGER IF EXISTS trigger_update_total_credits ON act_users;

CREATE TRIGGER trigger_update_total_credits
    BEFORE UPDATE ON act_users
    FOR EACH ROW
    EXECUTE FUNCTION update_total_credits();

-- 12. 验证更新
SELECT 
    'Database updated successfully' as status,
    COUNT(*) as total_users,
    SUM(subscription_credits) as total_subscription_credits,
    SUM(recharge_credits) as total_recharge_credits,
    SUM(credits_balance) as total_credits
FROM act_users; 