-- 修复版本的订阅清理函数
-- 使用允许的transaction_type值

-- 1. 立即清理过期订阅积分的函数
CREATE OR REPLACE FUNCTION immediate_subscription_cleanup()
RETURNS TEXT AS $$
DECLARE
    v_start_time TIMESTAMP := CURRENT_TIMESTAMP;
    v_result TEXT := '';
    v_cleaned_count INTEGER := 0;
    v_user_record RECORD;
BEGIN
    -- 清理已取消或已过期的订阅积分
    FOR v_user_record IN 
        SELECT id, subscription_credits, recharge_credits, subscription_status, subscription_end_date
        FROM act_users 
        WHERE (subscription_status = 'cancelled' OR subscription_status = 'active') 
          AND subscription_end_date < CURRENT_TIMESTAMP 
          AND subscription_credits > 0
    LOOP
        -- 清零订阅积分
        UPDATE act_users 
        SET subscription_credits = 0,
            credits_balance = recharge_credits,
            subscription_status = 'expired'
        WHERE id = v_user_record.id;
        
        v_cleaned_count := v_cleaned_count + 1;
        v_result := v_result || '用户 ' || v_user_record.id || ' 的订阅积分已清零 (原积分: ' || v_user_record.subscription_credits || '); ';
    END LOOP;
    
    v_result := '清理完成于 ' || CURRENT_TIMESTAMP || '. 共清理 ' || v_cleaned_count || ' 个用户. ' || v_result;
    
    -- 记录清理操作（使用允许的transaction_type）
    INSERT INTO act_credit_transactions (
        user_id,
        transaction_type,
        credits_amount,
        balance_before,
        balance_after,
        description,
        reference_id
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', -- 系统用户ID
        'refund', -- 使用允许的transaction_type
        0,
        0,
        0,
        v_result,
        'immediate_cleanup_' || EXTRACT(EPOCH FROM v_start_time)::text
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 2. 检查订阅清理状态的函数
CREATE OR REPLACE FUNCTION check_subscription_cleanup_status()
RETURNS TABLE(
    status_summary TEXT,
    expired_count INTEGER,
    expiring_soon_count INTEGER,
    active_count INTEGER,
    cancelled_count INTEGER
) AS $$
DECLARE
    v_expired_count INTEGER;
    v_expiring_soon_count INTEGER;
    v_active_count INTEGER;
    v_cancelled_count INTEGER;
BEGIN
    -- 统计各种状态的用户数量
    SELECT COUNT(*) INTO v_expired_count
    FROM act_users 
    WHERE (subscription_status = 'cancelled' OR subscription_status = 'active') 
      AND subscription_end_date < CURRENT_TIMESTAMP 
      AND subscription_credits > 0;
    
    SELECT COUNT(*) INTO v_expiring_soon_count
    FROM act_users 
    WHERE subscription_status = 'active' 
      AND subscription_end_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '7 days';
    
    SELECT COUNT(*) INTO v_active_count
    FROM act_users 
    WHERE subscription_status = 'active' 
      AND subscription_end_date >= CURRENT_TIMESTAMP;
    
    SELECT COUNT(*) INTO v_cancelled_count
    FROM act_users 
    WHERE subscription_status = 'cancelled' 
      AND subscription_end_date >= CURRENT_TIMESTAMP;
    
    RETURN QUERY SELECT 
        '订阅状态统计'::TEXT,
        v_expired_count,
        v_expiring_soon_count,
        v_active_count,
        v_cancelled_count;
END;
$$ LANGUAGE plpgsql;

-- 3. 每日自动清理函数
CREATE OR REPLACE FUNCTION daily_subscription_cleanup()
RETURNS TEXT AS $$
DECLARE
    v_result TEXT;
BEGIN
    v_result := immediate_subscription_cleanup();
    
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
        'refund', -- 使用允许的transaction_type
        0,
        0,
        0,
        '每日订阅清理: ' || v_result,
        'daily_cleanup_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建过期订阅视图
CREATE OR REPLACE VIEW act_expiring_subscriptions AS
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
    CASE 
        WHEN subscription_end_date < CURRENT_TIMESTAMP THEN '已过期'
        WHEN subscription_end_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '7 days' THEN '即将过期'
        ELSE '正常'
    END as expiry_status
FROM act_users 
WHERE subscription_status IN ('active', 'cancelled')
  AND subscription_end_date IS NOT NULL
ORDER BY subscription_end_date ASC;

-- 测试函数
SELECT '清理函数创建完成' as status;
SELECT check_subscription_cleanup_status();


