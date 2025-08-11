-- 直接清理用户订阅积分
-- 强制清理，不依赖时间判断

-- 1. 查看用户当前状态
SELECT 
    '当前状态' as status,
    id,
    email,
    subscription_status,
    subscription_end_date,
    subscription_credits,
    recharge_credits,
    credits_balance,
    CURRENT_TIMESTAMP as current_time
FROM act_users 
WHERE email = 'q9425916@gmail.com';

-- 2. 强制清理订阅积分（不管时间）
UPDATE act_users 
SET 
    subscription_credits = 0,
    credits_balance = recharge_credits,
    subscription_status = 'expired'
WHERE email = 'q9425916@gmail.com'
  AND subscription_credits > 0;

-- 3. 记录清理交易
        INSERT INTO act_credit_transactions (
            user_id,
            transaction_type,
            credits_amount,
            balance_before,
            balance_after,
            description,
            reference_id
        ) 
        SELECT 
            id,
            'subscription_expiry',
            -subscription_credits,
            subscription_credits + recharge_credits,
            recharge_credits,
            '订阅周期结束，积分清零',
            'manual_cleanup_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text
        FROM act_users 
        WHERE email = 'q9425916@gmail.com'
          AND subscription_credits > 0;

-- 4. 查看清理后的结果
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

-- 5. 查看最近的交易记录
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
