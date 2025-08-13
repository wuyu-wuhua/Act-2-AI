-- 立即清理过期订阅积分
-- 针对已取消或已过期的订阅

-- 1. 查看当前需要清理的用户
SELECT 
    '需要清理的用户' as status,
    id,
    email,
    subscription_status,
    subscription_end_date,
    subscription_credits,
    recharge_credits,
    credits_balance
FROM act_users 
WHERE subscription_end_date < CURRENT_TIMESTAMP 
  AND subscription_credits > 0;

-- 2. 立即清理过期订阅积分
DO $$
DECLARE
    v_user_record RECORD;
    v_cleaned_count INTEGER := 0;
BEGIN
    -- 清理已过期的订阅积分（包括已取消和未取消的）
    FOR v_user_record IN 
        SELECT 
            id, 
            subscription_credits, 
            recharge_credits, 
            subscription_status, 
            subscription_end_date
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
            'immediate_cleanup_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text
        );
        
        RAISE NOTICE '用户 % 的订阅积分已清零 (原积分: %)', v_user_record.id, v_user_record.subscription_credits;
    END LOOP;
    
    RAISE NOTICE '清理完成，共清理 % 个用户', v_cleaned_count;
END $$;

-- 3. 查看清理后的结果
SELECT 
    '清理后的结果' as status,
    id,
    email,
    subscription_status,
    subscription_end_date,
    subscription_credits,
    recharge_credits,
    credits_balance
FROM act_users 
WHERE email = 'q9425916@gmail.com';

-- 4. 查看最近的交易记录
SELECT 
    '最近的交易记录' as status,
    transaction_type,
    credits_amount,
    description,
    created_at
FROM act_credit_transactions
WHERE user_id = (SELECT id FROM act_users WHERE email = 'q9425916@gmail.com')
ORDER BY created_at DESC
LIMIT 5;
