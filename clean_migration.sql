-- 完全清理迁移脚本
-- 删除所有相关表并重新创建，确保数据类型一致

-- 1. 删除所有相关的外键约束和表
DROP VIEW IF EXISTS act_user_credit_overview CASCADE;
DROP TABLE IF EXISTS act_credit_transactions CASCADE;
DROP TABLE IF EXISTS act_credit_purchases CASCADE;
DROP TABLE IF EXISTS act_credit_packages CASCADE;
DROP TABLE IF EXISTS act_payment_records CASCADE;
DROP TABLE IF EXISTS act_user_usage CASCADE;
DROP TABLE IF EXISTS act_video_generations CASCADE;
DROP TABLE IF EXISTS act_user_files CASCADE;
DROP TABLE IF EXISTS act_users CASCADE;

-- 2. 重新创建用户表（使用UUID）
CREATE TABLE act_users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    google_id VARCHAR(100) UNIQUE,
    google_avatar VARCHAR(500),
    google_full_name VARCHAR(100),
    is_paid_user BOOLEAN DEFAULT FALSE,
    price_name VARCHAR(100) DEFAULT NULL,
    price_type VARCHAR(20) DEFAULT NULL CHECK (price_type IN ('monthly', 'yearly')),
    credits_balance INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned'))
);

-- 3. 创建积分包表
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

-- 4. 创建积分购买记录表（使用UUID类型的user_id）
CREATE TABLE act_credit_purchases (
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

-- 5. 创建积分交易记录表（使用UUID类型的user_id）
CREATE TABLE act_credit_transactions (
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

-- 6. 创建其他相关表（如果需要）
CREATE TABLE act_payment_records (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('subscription')),
    subscription_id INTEGER NULL,
    order_no VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES act_users(id) ON DELETE CASCADE
);

CREATE TABLE act_user_usage (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    usage_type VARCHAR(20) NOT NULL CHECK (usage_type IN ('free_trial', 'credits')),
    video_duration INTEGER NOT NULL,
    credits_consumed INTEGER NOT NULL,
    resolution VARCHAR(20) DEFAULT '1080p',
    generation_id VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES act_users(id) ON DELETE CASCADE
);

CREATE TABLE act_video_generations (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    generation_id VARCHAR(100) UNIQUE NOT NULL,
    input_image_file_id BIGINT NULL,
    input_video_file_id BIGINT NULL,
    output_video_file_id BIGINT NULL,
    output_thumbnail_file_id BIGINT NULL,
    video_duration INTEGER,
    resolution VARCHAR(20) DEFAULT '1080p',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress_percentage INTEGER DEFAULT 0,
    error_message TEXT,
    credits_consumed INTEGER DEFAULT 0,
    generation_started_at TIMESTAMP NULL,
    generation_completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES act_users(id) ON DELETE CASCADE
);

CREATE TABLE act_user_files (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('input_image', 'input_video', 'output_video', 'thumbnail')),
    original_filename VARCHAR(255) NOT NULL,
    supabase_bucket VARCHAR(100) NOT NULL,
    supabase_path VARCHAR(500) NOT NULL,
    supabase_url VARCHAR(500),
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    duration INTEGER,
    resolution VARCHAR(20),
    generation_id VARCHAR(100) NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES act_users(id) ON DELETE CASCADE
);

-- 7. 创建所有索引
CREATE INDEX idx_act_users_email ON act_users(email);
CREATE INDEX idx_act_users_google_id ON act_users(google_id);
CREATE INDEX idx_act_users_username ON act_users(username);
CREATE INDEX idx_act_users_status ON act_users(status);
CREATE INDEX idx_act_users_credits ON act_users(credits_balance);

CREATE INDEX idx_act_credit_packages_active ON act_credit_packages(is_active);
CREATE INDEX idx_act_credit_packages_popular ON act_credit_packages(is_popular);
CREATE INDEX idx_act_credit_packages_price ON act_credit_packages(price);

CREATE INDEX idx_act_credit_purchases_user_id ON act_credit_purchases(user_id);
CREATE INDEX idx_act_credit_purchases_status ON act_credit_purchases(payment_status);
CREATE INDEX idx_act_credit_purchases_created_at ON act_credit_purchases(purchased_at);

CREATE INDEX idx_act_credit_transactions_user_id ON act_credit_transactions(user_id);
CREATE INDEX idx_act_credit_transactions_type ON act_credit_transactions(transaction_type);
CREATE INDEX idx_act_credit_transactions_created_at ON act_credit_transactions(created_at);

CREATE INDEX idx_act_payment_records_user_id ON act_payment_records(user_id);
CREATE INDEX idx_act_payment_records_order_no ON act_payment_records(order_no);
CREATE INDEX idx_act_payment_records_status ON act_payment_records(payment_status);

CREATE INDEX idx_act_user_usage_user_id ON act_user_usage(user_id);
CREATE INDEX idx_act_user_usage_type ON act_user_usage(usage_type);
CREATE INDEX idx_act_user_usage_created_at ON act_user_usage(created_at);
CREATE INDEX idx_act_user_usage_generation_id ON act_user_usage(generation_id);

CREATE INDEX idx_act_video_generations_user_id ON act_video_generations(user_id);
CREATE INDEX idx_act_video_generations_generation_id ON act_video_generations(generation_id);
CREATE INDEX idx_act_video_generations_status ON act_video_generations(status);
CREATE INDEX idx_act_video_generations_created_at ON act_video_generations(created_at);

CREATE INDEX idx_act_user_files_user_id ON act_user_files(user_id);
CREATE INDEX idx_act_user_files_type ON act_user_files(file_type);
CREATE INDEX idx_act_user_files_generation_id ON act_user_files(generation_id);
CREATE INDEX idx_act_user_files_created_at ON act_user_files(created_at);
CREATE INDEX idx_act_user_files_supabase_path ON act_user_files(supabase_path);
CREATE INDEX idx_act_user_files_bucket ON act_user_files(supabase_bucket);

-- 8. 创建触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. 创建触发器
CREATE TRIGGER update_act_users_updated_at 
    BEFORE UPDATE ON act_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_act_credit_packages_updated_at 
    BEFORE UPDATE ON act_credit_packages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_act_payment_records_updated_at 
    BEFORE UPDATE ON act_payment_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_act_video_generations_updated_at 
    BEFORE UPDATE ON act_video_generations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 10. 插入默认积分包数据
INSERT INTO act_credit_packages (package_name, package_description, price, credits_amount, is_popular, is_best_value) VALUES
('基础积分包', '适合轻度使用', 39.9, 1000, FALSE, FALSE),
('标准积分包', '适合日常使用', 69.9, 2000, TRUE, TRUE),
('高级积分包', '适合专业用户', 99.9, 3600, FALSE, FALSE);

-- 11. 创建用户积分概览视图
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
SELECT 'Clean migration completed successfully! All tables recreated with UUID user_id.' as status; 