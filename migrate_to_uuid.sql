-- 数据库迁移脚本：将用户ID从BIGINT转换为UUID
-- 注意：这个脚本需要在Supabase控制台中执行

-- 1. 首先备份现有数据（可选）
-- CREATE TABLE act_users_backup AS SELECT * FROM act_users;
-- CREATE TABLE act_credit_transactions_backup AS SELECT * FROM act_credit_transactions;

-- 2. 删除现有的外键约束
ALTER TABLE act_credit_transactions DROP CONSTRAINT IF EXISTS act_credit_transactions_user_id_fkey;
ALTER TABLE act_payment_records DROP CONSTRAINT IF EXISTS act_payment_records_user_id_fkey;
ALTER TABLE act_user_usage DROP CONSTRAINT IF EXISTS act_user_usage_user_id_fkey;
ALTER TABLE act_video_generations DROP CONSTRAINT IF EXISTS act_video_generations_user_id_fkey;
ALTER TABLE act_user_files DROP CONSTRAINT IF EXISTS act_user_files_user_id_fkey;

-- 3. 修改用户表结构
-- 注意：如果表已存在，需要先删除再重建
DROP TABLE IF EXISTS act_users CASCADE;

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

-- 4. 修改积分交易记录表
DROP TABLE IF EXISTS act_credit_transactions CASCADE;

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

-- 5. 重新创建索引
CREATE INDEX idx_act_users_email ON act_users(email);
CREATE INDEX idx_act_users_google_id ON act_users(google_id);
CREATE INDEX idx_act_users_username ON act_users(username);
CREATE INDEX idx_act_users_status ON act_users(status);
CREATE INDEX idx_act_users_credits ON act_users(credits_balance);

CREATE INDEX idx_act_credit_transactions_user_id ON act_credit_transactions(user_id);
CREATE INDEX idx_act_credit_transactions_type ON act_credit_transactions(transaction_type);
CREATE INDEX idx_act_credit_transactions_created_at ON act_credit_transactions(created_at);

-- 6. 创建触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_act_users_updated_at 
    BEFORE UPDATE ON act_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. 插入测试用户（可选，用于测试）
-- INSERT INTO act_users (id, email, credits_balance) VALUES 
-- ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 0);

-- 注意：执行此脚本后，需要重新注册用户，因为用户ID格式已更改 