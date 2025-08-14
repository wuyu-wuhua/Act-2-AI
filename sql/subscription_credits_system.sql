-- 订阅积分系统完善SQL脚本
-- 确保act_users表有必要的字段来支持订阅积分分离管理

-- 检查并添加订阅积分管理所需的字段
DO $$
DECLARE
    column_exists boolean;
BEGIN
    -- 检查subscription_credits字段
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'act_users' 
        AND column_name = 'subscription_credits'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE act_users ADD COLUMN subscription_credits INTEGER DEFAULT 0;
        RAISE NOTICE '已添加 subscription_credits 字段';
    ELSE
        RAISE NOTICE 'subscription_credits 字段已存在';
    END IF;
    
    -- 检查recharge_credits字段
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'act_users' 
        AND column_name = 'recharge_credits'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE act_users ADD COLUMN recharge_credits INTEGER DEFAULT 0;
        RAISE NOTICE '已添加 recharge_credits 字段';
    ELSE
        RAISE NOTICE 'recharge_credits 字段已存在';
    END IF;
    
    -- 检查subscription_status字段
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'act_users' 
        AND column_name = 'subscription_status'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE act_users ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'inactive';
        RAISE NOTICE '已添加 subscription_status 字段';
    ELSE
        RAISE NOTICE 'subscription_status 字段已存在';
    END IF;
    
    -- 检查subscription_start_date字段
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'act_users' 
        AND column_name = 'subscription_start_date'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE act_users ADD COLUMN subscription_start_date TIMESTAMP NULL;
        RAISE NOTICE '已添加 subscription_start_date 字段';
    ELSE
        RAISE NOTICE 'subscription_start_date 字段已存在';
    END IF;
    
    -- 检查subscription_end_date字段
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'act_users' 
        AND column_name = 'subscription_end_date'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE act_users ADD COLUMN subscription_end_date TIMESTAMP NULL;
        RAISE NOTICE '已添加 subscription_end_date 字段';
    ELSE
        RAISE NOTICE 'subscription_end_date 字段已存在';
    END IF;
    
    -- 检查stripe_subscription_id字段
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'act_users' 
        AND column_name = 'stripe_subscription_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE act_users ADD COLUMN stripe_subscription_id VARCHAR(100) NULL;
        RAISE NOTICE '已添加 stripe_subscription_id 字段';
    ELSE
        RAISE NOTICE 'stripe_subscription_id 字段已存在';
    END IF;
    
    -- 检查stripe_customer_id字段
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'act_users' 
        AND column_name = 'stripe_customer_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE act_users ADD COLUMN stripe_customer_id VARCHAR(100) NULL;
        RAISE NOTICE '已添加 stripe_customer_id 字段';
    ELSE
        RAISE NOTICE 'stripe_customer_id 字段已存在';
    END IF;
END $$;

-- 创建约束确保积分一致性
DO $$
BEGIN
    -- 添加检查约束确保credits_balance = subscription_credits + recharge_credits
    IF NOT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE table_name = 'act_users' 
        AND constraint_name = 'credits_balance_consistency'
    ) THEN
        ALTER TABLE act_users 
        ADD CONSTRAINT credits_balance_consistency 
        CHECK (credits_balance = COALESCE(subscription_credits, 0) + COALESCE(recharge_credits, 0));
        RAISE NOTICE '已添加积分一致性约束';
    ELSE
        RAISE NOTICE '积分一致性约束已存在';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '添加约束时出错，可能是数据不一致，请手动检查和修复数据';
END $$;

-- 创建订阅状态约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.check_constraints 
        WHERE constraint_name = 'act_users_subscription_status_check'
    ) THEN
        ALTER TABLE act_users 
        ADD CONSTRAINT act_users_subscription_status_check 
        CHECK (subscription_status IN ('inactive', 'active', 'canceled', 'cancelled', 'expired', 'past_due', 'unpaid'));
        RAISE NOTICE '已添加订阅状态约束';
    ELSE
        RAISE NOTICE '订阅状态约束已存在';
    END IF;
END $$;

-- 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_act_users_subscription_status ON act_users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_act_users_subscription_end_date ON act_users(subscription_end_date);
CREATE INDEX IF NOT EXISTS idx_act_users_subscription_credits ON act_users(subscription_credits);
CREATE INDEX IF NOT EXISTS idx_act_users_recharge_credits ON act_users(recharge_credits);
CREATE INDEX IF NOT EXISTS idx_act_users_stripe_subscription_id ON act_users(stripe_subscription_id);

-- 创建订阅积分管理的视图
CREATE OR REPLACE VIEW act_subscription_credit_summary AS
SELECT 
    id,
    username,
    email,
    subscription_status,
    subscription_start_date,
    subscription_end_date,
    subscription_credits,
    recharge_credits,
    credits_balance,
    (subscription_credits + recharge_credits) as calculated_balance,
    CASE 
        WHEN credits_balance != (COALESCE(subscription_credits, 0) + COALESCE(recharge_credits, 0)) THEN '不一致'
        ELSE '一致'
    END as balance_consistency,
    CASE 
        WHEN subscription_end_date IS NULL THEN '无订阅'
        WHEN subscription_end_date < CURRENT_TIMESTAMP AND subscription_status IN ('active', 'canceled', 'cancelled') THEN '已过期'
        WHEN subscription_end_date >= CURRENT_TIMESTAMP AND subscription_status = 'active' THEN '活跃'
        WHEN subscription_status IN ('canceled', 'cancelled') THEN '已取消'
        ELSE subscription_status
    END as subscription_display_status,
    stripe_subscription_id,
    stripe_customer_id
FROM act_users 
WHERE subscription_credits > 0 OR recharge_credits > 0 OR subscription_status != 'inactive'
ORDER BY subscription_end_date DESC NULLS LAST;

-- 创建自动清理过期订阅积分的函数
CREATE OR REPLACE FUNCTION auto_cleanup_expired_subscription_credits()
RETURNS TEXT AS $$
DECLARE
    v_result TEXT := '';
    v_cleaned_count INTEGER := 0;
    v_user_record RECORD;
BEGIN
    -- 查找所有已过期但仍有订阅积分的用户
    FOR v_user_record IN 
        SELECT id, subscription_credits, recharge_credits, subscription_status, subscription_end_date
        FROM act_users 
        WHERE subscription_status IN ('canceled', 'cancelled', 'past_due', 'unpaid')
          AND subscription_end_date < CURRENT_TIMESTAMP 
          AND subscription_credits > 0
    LOOP
        -- 清零订阅积分，保留充值积分
        UPDATE act_users 
        SET subscription_credits = 0,
            credits_balance = recharge_credits,
            subscription_status = 'expired'
        WHERE id = v_user_record.id;
        
        -- 记录交易历史
        INSERT INTO act_credit_transactions (
            user_id,
            transaction_type,
            credits_amount,
            balance_before,
            balance_after,
            description,
            reference_id
        ) VALUES (
            v_user_record.id,
            'refund',
            -v_user_record.subscription_credits,
            v_user_record.subscription_credits + v_user_record.recharge_credits,
            v_user_record.recharge_credits,
            '自动清理过期订阅积分',
            'auto_cleanup_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text
        );
        
        v_cleaned_count := v_cleaned_count + 1;
        v_result := v_result || '用户 ' || v_user_record.id || ' 清零订阅积分 ' || v_user_record.subscription_credits || '; ';
    END LOOP;
    
    v_result := '自动清理完成于 ' || CURRENT_TIMESTAMP || '. 共清理 ' || v_cleaned_count || ' 个用户. ' || v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 显示完成信息
SELECT '订阅积分系统数据库结构完善完成' as status;

-- 显示当前订阅积分统计
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE subscription_credits > 0) as users_with_subscription_credits,
    COUNT(*) FILTER (WHERE recharge_credits > 0) as users_with_recharge_credits,
    COUNT(*) FILTER (WHERE subscription_status = 'active') as active_subscriptions,
    COUNT(*) FILTER (WHERE subscription_status IN ('canceled', 'cancelled')) as canceled_subscriptions,
    COUNT(*) FILTER (WHERE subscription_end_date < CURRENT_TIMESTAMP AND subscription_credits > 0) as expired_with_credits,
    SUM(subscription_credits) as total_subscription_credits,
    SUM(recharge_credits) as total_recharge_credits,
    SUM(credits_balance) as total_balance
FROM act_users;