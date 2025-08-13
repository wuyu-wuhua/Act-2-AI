-- 快速修复脚本
-- 确保数据库表正确创建并可以正常工作

-- 1. 删除可能存在的表（如果结构有问题）
DROP TABLE IF EXISTS act_credit_transactions CASCADE;
DROP TABLE IF EXISTS act_users CASCADE;

-- 2. 重新创建用户表
CREATE TABLE act_users (
    id UUID PRIMARY KEY,
    email VARCHAR(100) UNIQUE,
    google_id VARCHAR(100) UNIQUE,
    google_full_name VARCHAR(100),
    google_avatar VARCHAR(500),
    credits_balance INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 重新创建积分交易表
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

-- 4. 创建索引
CREATE INDEX idx_act_users_email ON act_users(email);
CREATE INDEX idx_act_users_credits ON act_users(credits_balance);
CREATE INDEX idx_act_credit_transactions_user_id ON act_credit_transactions(user_id);
CREATE INDEX idx_act_credit_transactions_type ON act_credit_transactions(transaction_type);

-- 5. 插入测试数据（可选）
INSERT INTO act_users (id, email, credits_balance) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 0)
ON CONFLICT (id) DO NOTHING;

-- 6. 验证表创建成功
SELECT 'Tables created successfully!' as status; 