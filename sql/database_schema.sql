-- 数据库表设计脚本
-- 支持用户登录、积分管理和支付系统
-- 项目前缀：act_ (Act 2 AI项目)
-- 适配Supabase存储桶和PostgreSQL

-- 1. 用户信息表
CREATE TABLE act_users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    google_id VARCHAR(100) UNIQUE,
    google_avatar VARCHAR(500),
    is_paid_user BOOLEAN DEFAULT FALSE,
    price_name VARCHAR(100) DEFAULT NULL,
    price_type VARCHAR(20) DEFAULT NULL CHECK (price_type IN ('monthly', 'yearly')),
    credits_balance INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned'))
);

-- 2. 订阅计划表
CREATE TABLE act_subscription_plans (
    id SERIAL PRIMARY KEY,
    price_name VARCHAR(100) NOT NULL,
    price_type VARCHAR(20) NOT NULL CHECK (price_type IN ('monthly', 'yearly')),
    price_description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    credits_amount INTEGER NOT NULL,
    discount_percentage INTEGER DEFAULT 0,
    is_popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 支付记录表
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
    FOREIGN KEY (user_id) REFERENCES act_users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES act_subscription_plans(id) ON DELETE SET NULL
);

-- 4. 用户使用记录表
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

-- 5. 视频生成历史记录表
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

-- 6. 用户文件表（适配Supabase存储桶）
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

-- 7. 积分交易记录表
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

-- 创建索引（优化查询性能）
CREATE INDEX idx_act_users_email ON act_users(email);
CREATE INDEX idx_act_users_google_id ON act_users(google_id);
CREATE INDEX idx_act_users_username ON act_users(username);
CREATE INDEX idx_act_users_status ON act_users(status);
CREATE INDEX idx_act_users_credits ON act_users(credits_balance);

CREATE INDEX idx_act_subscription_plans_type ON act_subscription_plans(price_type);
CREATE INDEX idx_act_subscription_plans_popular ON act_subscription_plans(is_popular);

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

CREATE INDEX idx_act_credit_transactions_user_id ON act_credit_transactions(user_id);
CREATE INDEX idx_act_credit_transactions_type ON act_credit_transactions(transaction_type);
CREATE INDEX idx_act_credit_transactions_created_at ON act_credit_transactions(created_at);

-- 插入最新的订阅计划数据（根据您的定价页面）
INSERT INTO act_subscription_plans (price_name, price_type, price_description, price, credits_amount, discount_percentage, is_popular) VALUES
('基础版', 'monthly', '非常适合爱好者和初学者', 39.90, 1300, 0, FALSE),
('专业版', 'monthly', '为创作者和专业人士而设', 99.90, 4000, 0, TRUE),
('基础版', 'yearly', '非常适合爱好者和初学者（年付优惠）', 442.80, 20000, 25, FALSE),
('专业版', 'yearly', '为创作者和专业人士而设（年付优惠）', 838.80, 50000, 30, TRUE);

-- 创建触发器函数来自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要自动更新updated_at的表创建触发器
CREATE TRIGGER update_act_users_updated_at BEFORE UPDATE ON act_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_act_subscription_plans_updated_at BEFORE UPDATE ON act_subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_act_payment_records_updated_at BEFORE UPDATE ON act_payment_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_act_video_generations_updated_at BEFORE UPDATE ON act_video_generations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 