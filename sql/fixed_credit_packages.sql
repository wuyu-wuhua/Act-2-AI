-- 修复版本的积分包配置表
-- 解决数据类型不匹配和字段缺失问题

-- 1. 首先确保用户表存在并包含所需字段
CREATE TABLE IF NOT EXISTS act_users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    google_id VARCHAR(100) UNIQUE,
    google_avatar VARCHAR(500),
    google_full_name VARCHAR(100), -- 添加缺失的字段
    is_paid_user BOOLEAN DEFAULT FALSE,
    price_name VARCHAR(100) DEFAULT NULL,
    price_type VARCHAR(20) DEFAULT NULL CHECK (price_type IN ('monthly', 'yearly')),
    credits_balance INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned'))
);

-- 2. 积分包配置表
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

-- 3. 积分购买记录表（使用UUID类型的user_id）
CREATE TABLE IF NOT EXISTS act_credit_purchases (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    package_id INT NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    credits_purchased INT NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES act_users(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES act_credit_packages(id) ON DELETE SET NULL
);

-- 4. 积分交易记录表（使用UUID类型的user_id）
CREATE TABLE IF NOT EXISTS act_credit_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'consumption', 'refund', 'bonus')),
    credits_amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    reference_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES act_users(id) ON DELETE CASCADE
);

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_act_users_email ON act_users(email);
CREATE INDEX IF NOT EXISTS idx_act_users_google_id ON act_users(google_id);
CREATE INDEX IF NOT EXISTS idx_act_users_credits ON act_users(credits_balance);

CREATE INDEX IF NOT EXISTS idx_act_credit_packages_active ON act_credit_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_act_credit_packages_popular ON act_credit_packages(is_popular);
CREATE INDEX IF NOT EXISTS idx_act_credit_packages_price ON act_credit_packages(price);

CREATE INDEX IF NOT EXISTS idx_act_credit_purchases_user_id ON act_credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_act_credit_purchases_status ON act_credit_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_act_credit_purchases_created_at ON act_credit_purchases(purchased_at);

CREATE INDEX IF NOT EXISTS idx_act_credit_transactions_user_id ON act_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_act_credit_transactions_type ON act_credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_act_credit_transactions_created_at ON act_credit_transactions(created_at);

-- 6. 创建触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. 创建触发器
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

-- 8. 插入积分包数据（如果表为空）
INSERT INTO act_credit_packages (package_name, package_description, price, credits_amount, is_popular, is_best_value)
SELECT * FROM (VALUES 
    ('基础积分包', '适合轻度使用', 39.9, 1000, FALSE, FALSE),
    ('标准积分包', '适合日常使用', 69.9, 2000, TRUE, TRUE),
    ('高级积分包', '适合专业用户', 99.9, 3600, FALSE, FALSE)
) AS v(package_name, package_description, price, credits_amount, is_popular, is_best_value)
WHERE NOT EXISTS (SELECT 1 FROM act_credit_packages);

-- 9. 创建用户积分概览视图（修复字段引用）
DROP VIEW IF EXISTS act_user_credit_overview;
CREATE VIEW act_user_credit_overview AS
SELECT 
    u.id as user_id,
    u.email,
    u.google_avatar,
    COALESCE(u.google_full_name, '') as google_full_name, -- 处理NULL值
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