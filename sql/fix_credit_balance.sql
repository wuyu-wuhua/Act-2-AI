-- 修复积分余额显示问题
-- 确保总积分 = 订阅积分 + 充值积分

-- 1. 首先检查当前用户数据
SELECT 
    id,
    email,
    subscription_credits,
    recharge_credits,
    credits_balance,
    (subscription_credits + recharge_credits) as calculated_total
FROM act_users 
WHERE email = 'q9425916@gmail.com';

-- 2. 修复积分余额计算
UPDATE act_users 
SET credits_balance = subscription_credits + recharge_credits
WHERE email = 'q9425916@gmail.com';

-- 3. 验证修复结果
SELECT 
    id,
    email,
    subscription_credits,
    recharge_credits,
    credits_balance,
    (subscription_credits + recharge_credits) as calculated_total
FROM act_users 
WHERE email = 'q9425916@gmail.com';

-- 4. 检查所有用户的积分余额是否正确
SELECT 
    id,
    email,
    subscription_credits,
    recharge_credits,
    credits_balance,
    (subscription_credits + recharge_credits) as calculated_total,
    CASE 
        WHEN credits_balance != (subscription_credits + recharge_credits) THEN '需要修复'
        ELSE '正确'
    END as status
FROM act_users 
WHERE credits_balance != (subscription_credits + recharge_credits);

-- 5. 批量修复所有用户的积分余额
UPDATE act_users 
SET credits_balance = subscription_credits + recharge_credits
WHERE credits_balance != (subscription_credits + recharge_credits);

-- 6. 最终验证
SELECT 
    '修复完成' as status,
    COUNT(*) as total_users,
    SUM(subscription_credits) as total_subscription_credits,
    SUM(recharge_credits) as total_recharge_credits,
    SUM(credits_balance) as total_credits_balance
FROM act_users;


