-- 改进的订阅积分管理系统（修复版本）
-- 先删除冲突的函数，然后重新创建

-- 1. 删除可能冲突的函数
DROP FUNCTION IF EXISTS renew_subscription_credits(UUID, VARCHAR, INTEGER, TIMESTAMP, TIMESTAMP, TEXT);
DROP FUNCTION IF EXISTS renew_subscription_credits(UUID, VARCHAR, INTEGER, TIMESTAMP, TIMESTAMP);
DROP FUNCTION IF EXISTS cancel_subscription(UUID);
DROP FUNCTION IF EXISTS cleanup_expired_subscriptions();
DROP FUNCTION IF EXISTS daily_subscription_cleanup();
DROP FUNCTION IF EXISTS check_subscription_status();

-- 2. 订阅积分清理函数（处理过期订阅）
CREATE OR REPLACE FUNCTION cleanup_expired_subscriptions()
RETURNS TEXT AS $$
DECLARE
    v_start_time TIMESTAMP := CURRENT_TIMESTAMP;
    v_result TEXT := '';
    v_cleaned_count INTEGER := 0;
    v_user_record RECORD;
BEGIN
    -- 清理已过期的订阅积分（包括已取消和未取消的）
    FOR v_user_record IN 
        SELECT 
            id, 
            subscription_credits, 
            recharge_credits, 
            subscription_status, 
            subscription_end_date,
            subscription_plan_id
        FROM act_users 
        WHERE subscription_end_date < CURRENT_TIMESTAMP 
          AND subscription_credits > 0
    LOOP
        -- 清零订阅积分，保留充值积分
        UPDATE act_users 
        SET 
            subscription_credits = 0,
            credits_balance = recharge_credits,
            subscription_status = 'expired'
        WHERE id = v_user_record.id;
        
        v_cleaned_count := v_cleaned_count + 1;
        v_result := v_result || '用户 ' || v_user_record.id || ' 的订阅积分已清零 (原积分: ' || v_user_record.subscription_credits || '); ';
        
        -- 记录积分清零交易
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
            'consumption',
            -v_user_record.subscription_credits,
            v_user_record.subscription_credits + v_user_record.recharge_credits,
            v_user_record.recharge_credits,
            '订阅到期，积分清零',
            'expiry_cleanup_' || EXTRACT(EPOCH FROM v_start_time)::text
        );
    END LOOP;
    
    v_result := '过期订阅清理完成于 ' || CURRENT_TIMESTAMP || '. 共清理 ' || v_cleaned_count || ' 个用户. ' || v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 3. 订阅续期函数（处理新周期开始）
CREATE OR REPLACE FUNCTION renew_subscription_credits(
    p_user_id UUID,
    p_plan_id VARCHAR(50),
    p_credits_amount INTEGER,
    p_start_date TIMESTAMP,
    p_end_date TIMESTAMP,
    p_description TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_user_record RECORD;
    v_old_subscription_credits INTEGER;
    v_result TEXT;
BEGIN
    -- 获取用户当前状态
    SELECT 
        subscription_credits,
        recharge_credits,
        subscription_status
    INTO v_user_record
    FROM act_users 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    v_old_subscription_credits := v_user_record.subscription_credits;
    
    -- 重置订阅积分为新套餐的积分
    UPDATE act_users 
    SET 
        subscription_credits = p_credits_amount,
        credits_balance = p_credits_amount + recharge_credits,
        subscription_status = 'active',
        subscription_start_date = p_start_date,
        subscription_end_date = p_end_date,
        subscription_plan_id = p_plan_id
    WHERE id = p_user_id;
    
    -- 记录续期交易
    INSERT INTO act_credit_transactions (
        user_id,
        transaction_type,
        credits_amount,
        balance_before,
        balance_after,
        description,
        reference_id
    ) VALUES (
        p_user_id,
        'purchase',
        p_credits_amount,
        v_old_subscription_credits + v_user_record.recharge_credits,
        p_credits_amount + v_user_record.recharge_credits,
        COALESCE(p_description, '订阅续期'),
        'renewal_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text
    );
    
    v_result := '用户 ' || p_user_id || ' 订阅续期成功，积分从 ' || v_old_subscription_credits || ' 重置为 ' || p_credits_amount;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 4. 取消订阅函数
CREATE OR REPLACE FUNCTION cancel_subscription(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_user_record RECORD;
    v_result TEXT;
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
    
    -- 如果订阅已经是取消状态，直接返回
    IF v_user_record.subscription_status = 'cancelled' THEN
        RETURN '用户 ' || p_user_id || ' 的订阅已经是取消状态';
    END IF;
    
    -- 设置订阅状态为已取消（积分保留到到期日）
    UPDATE act_users 
    SET subscription_status = 'cancelled'
    WHERE id = p_user_id;
    
    v_result := '用户 ' || p_user_id || ' 的订阅已取消，积分将在 ' || v_user_record.subscription_end_date || ' 到期时清零';
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 5. 每日自动清理函数
CREATE OR REPLACE FUNCTION daily_subscription_cleanup()
RETURNS TEXT AS $$
DECLARE
    v_result TEXT;
BEGIN
    v_result := cleanup_expired_subscriptions();
    
    -- 记录每日清理操作
    INSERT INTO act_credit_transactions (
        user_id,
        transaction_type,
        credits_amount,
        balance_before,
        balance_after,
        description,
        reference_id
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        'refund',
        0,
        0,
        0,
        '每日订阅清理: ' || v_result,
        'daily_cleanup_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 6. 检查订阅状态函数
CREATE OR REPLACE FUNCTION check_subscription_status()
RETURNS TABLE(
    status_summary TEXT,
    active_count INTEGER,
    cancelled_count INTEGER,
    expired_count INTEGER,
    expiring_soon_count INTEGER,
    total_subscription_credits INTEGER
) AS $$
DECLARE
    v_active_count INTEGER;
    v_cancelled_count INTEGER;
    v_expired_count INTEGER;
    v_expiring_soon_count INTEGER;
    v_total_subscription_credits INTEGER;
BEGIN
    -- 统计各种状态的用户数量
    SELECT COUNT(*) INTO v_active_count
    FROM act_users 
    WHERE subscription_status = 'active' 
      AND subscription_end_date >= CURRENT_TIMESTAMP;
    
    SELECT COUNT(*) INTO v_cancelled_count
    FROM act_users 
    WHERE subscription_status = 'cancelled' 
      AND subscription_end_date >= CURRENT_TIMESTAMP;
    
    SELECT COUNT(*) INTO v_expired_count
    FROM act_users 
    WHERE subscription_status = 'expired';
    
    SELECT COUNT(*) INTO v_expiring_soon_count
    FROM act_users 
    WHERE subscription_status = 'active' 
      AND subscription_end_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '7 days';
    
    SELECT COALESCE(SUM(subscription_credits), 0) INTO v_total_subscription_credits
    FROM act_users;
    
    RETURN QUERY SELECT 
        '订阅状态统计'::TEXT,
        v_active_count,
        v_cancelled_count,
        v_expired_count,
        v_expiring_soon_count,
        v_total_subscription_credits;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建订阅状态视图
CREATE OR REPLACE VIEW act_subscription_status AS
SELECT 
    id,
    email,
    subscription_status,
    subscription_start_date,
    subscription_end_date,
    subscription_plan_id,
    subscription_credits,
    recharge_credits,
    credits_balance,
    CASE 
        WHEN subscription_end_date < CURRENT_TIMESTAMP THEN '已过期'
        WHEN subscription_end_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '7 days' THEN '即将过期'
        ELSE '正常'
    END as expiry_status,
    CASE 
        WHEN subscription_status = 'cancelled' THEN '已取消（积分保留到到期）'
        WHEN subscription_status = 'active' THEN '活跃'
        WHEN subscription_status = 'expired' THEN '已过期'
        ELSE '未知'
    END as status_description
FROM act_users 
WHERE subscription_status IS NOT NULL
ORDER BY subscription_end_date ASC;

-- 8. 测试函数
SELECT '订阅系统创建完成' as status;
SELECT check_subscription_status();
