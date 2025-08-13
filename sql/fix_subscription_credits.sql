-- 修复订阅积分未清零问题
-- 执行前请备份数据库

-- 1. 首先检查当前状态
SELECT 
    '当前状态检查' as info,
    COUNT(*) as total_users,
    COUNT(CASE WHEN subscription_status = 'cancelled' THEN 1 END) as cancelled_users,
    COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_users,
    COUNT(CASE WHEN subscription_status = 'expired' THEN 1 END) as expired_users,
    SUM(subscription_credits) as total_subscription_credits,
    SUM(recharge_credits) as total_recharge_credits
FROM act_users;

-- 2. 检查需要清零积分的用户
SELECT 
    '需要清零积分的用户' as info,
    id,
    email,
    subscription_status,
    subscription_start_date,
    subscription_end_date,
    subscription_cancelled_date,
    subscription_credits,
    recharge_credits,
    credits_balance,
    CASE 
        WHEN subscription_end_date < CURRENT_TIMESTAMP THEN '已过期'
        ELSE '未过期'
    END as expiry_status
FROM act_users 
WHERE (subscription_status = 'cancelled' OR subscription_status = 'active')
  AND subscription_end_date < CURRENT_TIMESTAMP
  AND subscription_credits > 0
ORDER BY subscription_end_date ASC;

-- 3. 手动执行积分清零（针对已过期但未清零的订阅）
DO $$ 
DECLARE
    v_user_record RECORD;
    v_processed_count INTEGER := 0;
    v_total_credits_cleared INTEGER := 0;
BEGIN
    RAISE NOTICE '开始手动清理过期订阅积分...';
    
    -- 查找所有需要处理过期积分的用户
    FOR v_user_record IN 
        SELECT 
            id, 
            email,
            subscription_credits, 
            subscription_end_date, 
            subscription_status,
            recharge_credits
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
        
        -- 清零订阅积分
        UPDATE act_users 
        SET 
            subscription_credits = 0,
            credits_balance = recharge_credits,
            subscription_status = 'expired'
        WHERE id = v_user_record.id;
        
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
            v_user_record.id,
            'expiry',
            -v_user_record.subscription_credits,
            v_user_record.subscription_credits + v_user_record.recharge_credits,
            v_user_record.recharge_credits,
            '手动清理过期订阅积分',
            'manual_cleanup_' || v_user_record.id::text || '_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text,
            'subscription',
            v_user_record.subscription_credits,
            0,
            v_user_record.recharge_credits,
            v_user_record.recharge_credits
        );
        
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
            v_user_record.id,
            'expired',
            NULL,
            NULL,
            v_user_record.subscription_end_date,
            CASE WHEN v_user_record.subscription_status = 'cancelled' THEN v_user_record.subscription_cancelled_date ELSE NULL END,
            0,
            CASE WHEN v_user_record.subscription_status = 'cancelled' THEN v_user_record.subscription_credits ELSE 0 END,
            v_user_record.subscription_credits,
            '手动清理过期订阅积分'
        );
        
        v_processed_count := v_processed_count + 1;
        v_total_credits_cleared := v_total_credits_cleared + v_user_record.subscription_credits;
        
        RAISE NOTICE '用户 % 的订阅积分已清零，清零数量: %', v_user_record.id, v_user_record.subscription_credits;
    END LOOP;
    
    RAISE NOTICE '手动清理完成！处理用户数: %, 清零积分总数: %', v_processed_count, v_total_credits_cleared;
END $$;

-- 4. 验证清理结果
SELECT 
    '清理后状态检查' as info,
    COUNT(*) as total_users,
    COUNT(CASE WHEN subscription_status = 'cancelled' THEN 1 END) as cancelled_users,
    COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_users,
    COUNT(CASE WHEN subscription_status = 'expired' THEN 1 END) as expired_users,
    SUM(subscription_credits) as total_subscription_credits,
    SUM(recharge_credits) as total_recharge_credits
FROM act_users;

-- 5. 检查清理后的用户状态
SELECT 
    '清理后的用户状态' as info,
    id,
    email,
    subscription_status,
    subscription_start_date,
    subscription_end_date,
    subscription_cancelled_date,
    subscription_credits,
    recharge_credits,
    credits_balance
FROM act_users 
WHERE subscription_status IN ('cancelled', 'active', 'expired')
ORDER BY subscription_status, subscription_end_date ASC;

-- 6. 检查交易记录
SELECT 
    '积分清零交易记录' as info,
    user_id,
    transaction_type,
    credits_amount,
    balance_before,
    balance_after,
    description,
    created_at
FROM act_credit_transactions 
WHERE transaction_type = 'expiry'
ORDER BY created_at DESC
LIMIT 10;

-- 7. 检查订阅状态记录
SELECT 
    '订阅状态变更记录' as info,
    user_id,
    subscription_status,
    credits_at_expiry,
    description,
    created_at
FROM act_subscription_status 
WHERE subscription_status = 'expired'
ORDER BY created_at DESC
LIMIT 10; 