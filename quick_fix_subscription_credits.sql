-- 快速修复订阅积分未清零问题
-- 这个脚本会立即清理所有过期的订阅积分

-- 1. 立即清理所有过期的订阅积分
DO $$ 
DECLARE
    v_user_record RECORD;
    v_processed_count INTEGER := 0;
    v_total_credits_cleared INTEGER := 0;
BEGIN
    RAISE NOTICE '开始快速清理过期订阅积分...';
    
    -- 查找所有需要清理的用户
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
        RAISE NOTICE '清理用户 % (邮箱: %), 状态: %, 结束日期: %, 订阅积分: %', 
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
            '快速清理过期订阅积分',
            'quick_cleanup_' || v_user_record.id::text || '_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text,
            'subscription',
            v_user_record.subscription_credits,
            0,
            v_user_record.recharge_credits,
            v_user_record.recharge_credits
        );
        
        v_processed_count := v_processed_count + 1;
        v_total_credits_cleared := v_total_credits_cleared + v_user_record.subscription_credits;
        
        RAISE NOTICE '用户 % 的订阅积分已清零，清零数量: %', v_user_record.id, v_user_record.subscription_credits;
    END LOOP;
    
    RAISE NOTICE '快速清理完成！处理用户数: %, 清零积分总数: %', v_processed_count, v_total_credits_cleared;
END $$;

-- 2. 验证清理结果
SELECT 
    '清理结果验证' as info,
    COUNT(*) as total_users,
    COUNT(CASE WHEN subscription_status = 'cancelled' THEN 1 END) as cancelled_users,
    COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_users,
    COUNT(CASE WHEN subscription_status = 'expired' THEN 1 END) as expired_users,
    SUM(subscription_credits) as total_subscription_credits,
    SUM(recharge_credits) as total_recharge_credits
FROM act_users;

-- 3. 显示清理后的用户状态
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