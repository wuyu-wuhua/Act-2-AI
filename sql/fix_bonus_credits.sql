-- 修复赠送积分问题
-- 将赠送的积分正确添加到recharge_credits字段

-- 1. 首先检查当前状态
SELECT '修复前状态' as status;
SELECT 
    id,
    email,
    subscription_credits,
    recharge_credits,
    credits_balance,
    (subscription_credits + recharge_credits) as calculated_total
FROM act_users 
WHERE email = 'q9425916@gmail.com';

-- 2. 计算应该有的充值积分（从交易记录中统计）
WITH bonus_credits AS (
    SELECT 
        user_id,
        SUM(credits_amount) as total_bonus
    FROM act_credit_transactions 
    WHERE transaction_type = 'bonus'
    AND user_id = (SELECT id FROM act_users WHERE email = 'q9425916@gmail.com')
    GROUP BY user_id
)
SELECT 
    '赠送积分统计' as info,
    COALESCE(total_bonus, 0) as total_bonus_credits
FROM bonus_credits;

-- 3. 修复充值积分
UPDATE act_users 
SET 
    recharge_credits = (
        SELECT COALESCE(SUM(credits_amount), 0)
        FROM act_credit_transactions 
        WHERE transaction_type = 'bonus'
        AND user_id = act_users.id
    ),
    credits_balance = subscription_credits + (
        SELECT COALESCE(SUM(credits_amount), 0)
        FROM act_credit_transactions 
        WHERE transaction_type = 'bonus'
        AND user_id = act_users.id
    )
WHERE email = 'q9425916@gmail.com';

-- 4. 验证修复结果
SELECT '修复后状态' as status;
SELECT 
    id,
    email,
    subscription_credits,
    recharge_credits,
    credits_balance,
    (subscription_credits + recharge_credits) as calculated_total
FROM act_users 
WHERE email = 'q9425916@gmail.com';

-- 5. 批量修复所有用户的赠送积分
UPDATE act_users 
SET 
    recharge_credits = (
        SELECT COALESCE(SUM(credits_amount), 0)
        FROM act_credit_transactions 
        WHERE transaction_type = 'bonus'
        AND user_id = act_users.id
    )
WHERE EXISTS (
    SELECT 1 
    FROM act_credit_transactions 
    WHERE transaction_type = 'bonus'
    AND user_id = act_users.id
);

-- 6. 更新所有用户的总积分
UPDATE act_users 
SET credits_balance = subscription_credits + recharge_credits;

-- 7. 最终验证
SELECT 
    '修复完成' as status,
    COUNT(*) as total_users,
    SUM(subscription_credits) as total_subscription_credits,
    SUM(recharge_credits) as total_recharge_credits,
    SUM(credits_balance) as total_credits_balance
FROM act_users;


