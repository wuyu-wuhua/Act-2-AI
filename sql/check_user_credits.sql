-- 检查用户积分详细数据
-- 针对用户 q9425916@gmail.com

-- 1. 检查用户基本信息
SELECT 
    id,
    email,
    subscription_credits,
    recharge_credits,
    credits_balance,
    (subscription_credits + recharge_credits) as calculated_total
FROM act_users 
WHERE email = 'q9425916@gmail.com';

-- 2. 检查积分交易记录
SELECT 
    id,
    transaction_type,
    credits_amount,
    balance_before,
    balance_after,
    description,
    created_at
FROM act_credit_transactions 
WHERE user_id = (
    SELECT id FROM act_users WHERE email = 'q9425916@gmail.com'
)
ORDER BY created_at DESC;

-- 3. 检查是否有赠送积分的记录
SELECT 
    COUNT(*) as bonus_transactions,
    SUM(credits_amount) as total_bonus_credits
FROM act_credit_transactions 
WHERE user_id = (
    SELECT id FROM act_users WHERE email = 'q9425916@gmail.com'
)
AND transaction_type = 'bonus';

-- 4. 检查所有交易记录的类型分布
SELECT 
    transaction_type,
    COUNT(*) as count,
    SUM(credits_amount) as total_amount
FROM act_credit_transactions 
WHERE user_id = (
    SELECT id FROM act_users WHERE email = 'q9425916@gmail.com'
)
GROUP BY transaction_type
ORDER BY total_amount DESC;


