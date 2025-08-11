-- 最简单的订阅清理函数
-- 完全避免插入到可能有约束的表

-- 1. 简单的expire_subscription_credits函数
CREATE OR REPLACE FUNCTION expire_subscription_credits(
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_record RECORD;
    v_subscription_credits INTEGER;
    v_recharge_credits INTEGER;
BEGIN
    -- 获取用户当前状态
    SELECT 
        subscription_status,
        subscription_credits,
        subscription_end_date,
        recharge_credits
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
        v_recharge_credits := v_user_record.recharge_credits;
        
        RAISE NOTICE '清零用户 % 的订阅积分，数量: %, 充值积分: %', 
                    p_user_id, v_subscription_credits, v_recharge_credits;
        
        -- 清零订阅积分
        UPDATE act_users 
        SET 
            subscription_credits = 0,
            credits_balance = recharge_credits,
            subscription_status = 'expired'
        WHERE id = p_user_id;
        
        -- 更新订阅状态为已过期（不插入交易记录，避免约束问题）
        PERFORM update_subscription_status(
            p_user_id,
            'expired',
            NULL,
            NULL,
            v_user_record.subscription_end_date,
            CASE WHEN v_user_record.subscription_status = 'cancelled' THEN v_user_record.subscription_cancelled_date ELSE NULL END,
            '订阅积分已过期清零'
        );
        
        RAISE NOTICE '用户 % 的订阅积分已成功清零', p_user_id;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 2. 简单的process_expired_subscriptions函数
CREATE OR REPLACE FUNCTION process_expired_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    v_user_record RECORD;
    v_processed_count INTEGER := 0;
    v_total_credits_cleared INTEGER := 0;
BEGIN
    RAISE NOTICE '开始处理过期订阅积分...';
    
    -- 查找所有需要处理过期积分的用户
    FOR v_user_record IN 
        SELECT 
            id, 
            email,
            subscription_credits, 
            subscription_end_date, 
            subscription_status
        FROM act_users 
        WHERE (subscription_status = 'cancelled' OR subscription_status = 'active')
          AND subscription_end_date < CURRENT_TIMESTAMP
          AND subscription_credits > 0
    LOOP
        RAISE NOTICE '处理用户 % (邮箱: %), 状态: %, 结束日期: %, 订阅积分: %', 
                    v_user_record.id, 
                    v_user_record.email,
                    v_user_record.subscription_status, 
                    v_user_record.subscription_end_date, 
                    v_user_record.subscription_credits;
        
        -- 处理每个用户的过期积分
        IF expire_subscription_credits(v_user_record.id) THEN
            v_processed_count := v_processed_count + 1;
            v_total_credits_cleared := v_total_credits_cleared + v_user_record.subscription_credits;
        END IF;
    END LOOP;
    
    RAISE NOTICE '过期订阅处理完成！处理用户数: %, 清零积分总数: %', v_processed_count, v_total_credits_cleared;
    RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql;

-- 3. 简单的立即清理函数（用于手动触发）
CREATE OR REPLACE FUNCTION immediate_subscription_cleanup()
RETURNS TEXT AS $$
DECLARE
    v_processed_count INTEGER;
    v_result TEXT;
    v_start_time TIMESTAMP := CURRENT_TIMESTAMP;
BEGIN
    RAISE NOTICE '开始执行立即订阅清理任务，时间: %', v_start_time;
    
    -- 处理过期的订阅积分
    v_processed_count := process_expired_subscriptions();
    
    v_result := 'Immediate subscription cleanup completed at ' || v_start_time || '. Processed ' || v_processed_count || ' expired subscriptions.';
    
    -- 不插入任何交易记录，避免约束问题
    RAISE NOTICE '立即订阅清理任务完成: %', v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建检查函数（用于验证清理状态）
CREATE OR REPLACE FUNCTION check_subscription_cleanup_status()
RETURNS TABLE(
    info TEXT,
    total_users BIGINT,
    cancelled_users BIGINT,
    active_users BIGINT,
    expired_users BIGINT,
    total_subscription_credits BIGINT,
    total_recharge_credits BIGINT,
    needs_cleanup_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        '订阅清理状态检查'::TEXT as info,
        COUNT(*)::BIGINT as total_users,
        COUNT(CASE WHEN subscription_status = 'cancelled' THEN 1 END)::BIGINT as cancelled_users,
        COUNT(CASE WHEN subscription_status = 'active' THEN 1 END)::BIGINT as active_users,
        COUNT(CASE WHEN subscription_status = 'expired' THEN 1 END)::BIGINT as expired_users,
        SUM(subscription_credits)::BIGINT as total_subscription_credits,
        SUM(recharge_credits)::BIGINT as total_recharge_credits,
        COUNT(CASE 
            WHEN (subscription_status = 'cancelled' OR subscription_status = 'active')
                 AND subscription_end_date < CURRENT_TIMESTAMP
                 AND subscription_credits > 0 
            THEN 1 
        END)::BIGINT as needs_cleanup_count
    FROM act_users;
END;
$$ LANGUAGE plpgsql;

-- 5. 测试简单版本的函数
SELECT '测试简单版本的清理函数' as test_info;

-- 检查当前状态
SELECT * FROM check_subscription_cleanup_status();

-- 执行立即清理（测试）
SELECT immediate_subscription_cleanup() as cleanup_result;

-- 再次检查状态
SELECT * FROM check_subscription_cleanup_status(); 