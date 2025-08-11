-- 确保用户表存在并包含积分字段
-- 如果act_users表不存在，先创建它
CREATE TABLE IF NOT EXISTS act_users (
    id UUID PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    google_id VARCHAR(100) UNIQUE,
    google_full_name VARCHAR(100),
    google_avatar VARCHAR(500),
    credits_balance INT DEFAULT 0,
    is_paid_user BOOLEAN DEFAULT FALSE,
    price_name VARCHAR(100),
    price_type VARCHAR(20) CHECK (price_type IN ('monthly', 'yearly')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned'))
);

-- 添加积分余额字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_users' AND column_name = 'credits_balance') THEN
        ALTER TABLE act_users ADD COLUMN credits_balance INT DEFAULT 0;
    END IF;
END $$;

-- 创建积分交易记录表（如果不存在）
CREATE TABLE IF NOT EXISTS act_credit_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'consumption', 'refund', 'bonus')),
    credits_amount INT NOT NULL,
    balance_before INT NOT NULL,
    balance_after INT NOT NULL,
    description TEXT,
    reference_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES act_users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_act_credit_transactions_user_id ON act_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_act_credit_transactions_type ON act_credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_act_credit_transactions_created_at ON act_credit_transactions(created_at);

-- 创建积分包表（如果不存在）
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

-- 插入默认积分包数据（如果表为空）
INSERT INTO act_credit_packages (package_name, package_description, price, credits_amount, is_popular, is_best_value)
SELECT * FROM (VALUES 
    ('基础积分包', '适合轻度使用', 39.9, 1000, FALSE, FALSE),
    ('标准积分包', '适合日常使用', 69.9, 2000, TRUE, TRUE),
    ('高级积分包', '适合专业用户', 99.9, 3600, FALSE, FALSE)
) AS v(package_name, package_description, price, credits_amount, is_popular, is_best_value)
WHERE NOT EXISTS (SELECT 1 FROM act_credit_packages);

-- 创建更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器（如果不存在）
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