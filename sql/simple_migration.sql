-- 简化迁移脚本：解决当前问题
-- 这个脚本不会删除现有数据，只修复结构问题

-- 1. 检查并添加缺失的字段到act_users表
DO $$ 
BEGIN
    -- 添加google_full_name字段（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_users' AND column_name = 'google_full_name') THEN
        ALTER TABLE act_users ADD COLUMN google_full_name VARCHAR(100);
    END IF;
    
    -- 确保credits_balance字段存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_users' AND column_name = 'credits_balance') THEN
        ALTER TABLE act_users ADD COLUMN credits_balance INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. 创建积分交易记录表（如果不存在）
CREATE TABLE IF NOT EXISTS act_credit_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'consumption', 'refund', 'bonus')),
    credits_amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    reference_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建积分包表（如果不存在）
CREATE TABLE IF NOT EXISTS act_credit_packages (
    id SERIAL PRIMARY KEY,
    package_name VARCHAR(100) NOT NULL,
    package_description TEXT,
    price DECIMAL(10,2) NOT NULL,
    credits_amount INT NOT NULL,
    is_popular BOOLEAN DEFAULT FALSE,
    is_best_value BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_act_credit_transactions_user_id ON act_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_act_credit_transactions_type ON act_credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_act_credit_transactions_created_at ON act_credit_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_act_credit_packages_active ON act_credit_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_act_credit_packages_popular ON act_credit_packages(is_popular);

-- 5. 插入默认积分包数据（如果表为空）
INSERT INTO act_credit_packages (package_name, package_description, price, credits_amount, is_popular, is_best_value)
SELECT * FROM (VALUES 
    ('基础积分包', '适合轻度使用', 39.9, 1000, FALSE, FALSE),
    ('标准积分包', '适合日常使用', 69.9, 2000, TRUE, TRUE),
    ('高级积分包', '适合专业用户', 99.9, 3600, FALSE, FALSE)
) AS v(package_name, package_description, price, credits_amount, is_popular, is_best_value)
WHERE NOT EXISTS (SELECT 1 FROM act_credit_packages);

-- 6. 创建触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. 创建触发器（如果不存在）
DROP TRIGGER IF EXISTS update_act_users_updated_at ON act_users;
CREATE TRIGGER update_act_users_updated_at 
    BEFORE UPDATE ON act_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_act_credit_packages_updated_at ON act_credit_packages;
CREATE TRIGGER update_act_credit_packages_updated_at 
    BEFORE UPDATE ON act_credit_packages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 8. 创建用户积分概览视图（修复版本）
DROP VIEW IF EXISTS act_user_credit_overview;
CREATE VIEW act_user_credit_overview AS
SELECT 
    u.id as user_id,
    u.email,
    u.google_avatar,
    COALESCE(u.google_full_name, '') as google_full_name,
    u.credits_balance as current_credits,
    COALESCE(purchase_stats.total_purchased, 0) as total_purchased,
    COALESCE(consumption_stats.total_consumed, 0) as total_consumed,
    u.created_at as user_created_at
FROM act_users u
LEFT JOIN (
    SELECT 
        user_id,
        SUM(credits_amount) as total_purchased
    FROM act_credit_transactions 
    WHERE transaction_type = 'purchase'
    GROUP BY user_id
) purchase_stats ON u.id = purchase_stats.user_id
LEFT JOIN (
    SELECT 
        user_id,
        SUM(ABS(credits_amount)) as total_consumed
    FROM act_credit_transactions 
    WHERE transaction_type = 'consumption'
    GROUP BY user_id
) consumption_stats ON u.id = consumption_stats.user_id;

-- 完成！
SELECT 'Migration completed successfully!' as status; 