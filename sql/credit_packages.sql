-- 积分包配置表
CREATE TABLE act_credit_packages (
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

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_act_credit_packages_updated_at 
    BEFORE UPDATE ON act_credit_packages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 插入积分包数据
INSERT INTO act_credit_packages (package_name, package_description, price, credits_amount, is_popular, is_best_value) VALUES
('基础积分包', '适合轻度使用', 39.9, 1000, FALSE, FALSE),
('标准积分包', '适合日常使用', 69.9, 2000, TRUE, TRUE),
('高级积分包', '适合专业用户', 99.9, 3600, FALSE, FALSE);

-- 创建索引
CREATE INDEX idx_act_credit_packages_active ON act_credit_packages(is_active);
CREATE INDEX idx_act_credit_packages_popular ON act_credit_packages(is_popular);
CREATE INDEX idx_act_credit_packages_price ON act_credit_packages(price);

-- 积分购买记录表
CREATE TABLE act_credit_purchases (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
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

-- 创建索引
CREATE INDEX idx_act_credit_purchases_user_id ON act_credit_purchases(user_id);
CREATE INDEX idx_act_credit_purchases_status ON act_credit_purchases(payment_status);
CREATE INDEX idx_act_credit_purchases_created_at ON act_credit_purchases(purchased_at);

-- 更新用户表，添加积分余额字段（如果还没有的话）
-- 注意：如果act_users表中已经有credits_balance字段，可以跳过这一步
-- ALTER TABLE act_users ADD COLUMN IF NOT EXISTS credits_balance INT DEFAULT 0;

-- 创建积分交易记录表（用于记录积分的增减）
CREATE TABLE act_credit_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'consumption', 'refund', 'bonus')),
    credits_amount INT NOT NULL,
    balance_before INT NOT NULL,
    balance_after INT NOT NULL,
    description TEXT,
    reference_id VARCHAR(100), -- 关联的订单ID或其他引用
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES act_users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_act_credit_transactions_user_id ON act_credit_transactions(user_id);
CREATE INDEX idx_act_credit_transactions_type ON act_credit_transactions(transaction_type);
CREATE INDEX idx_act_credit_transactions_created_at ON act_credit_transactions(created_at);

-- 创建视图：用户积分概览
CREATE VIEW act_user_credit_overview AS
SELECT 
    u.id as user_id,
    u.email,
    u.google_avatar,
    u.google_full_name,
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