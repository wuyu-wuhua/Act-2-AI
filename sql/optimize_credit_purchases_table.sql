-- 优化 act_credit_purchases 表结构，使其成为完整的积分流水表

-- 1. 首先备份现有数据（如果有的话）
-- CREATE TABLE act_credit_purchases_backup AS SELECT * FROM act_credit_purchases;

-- 2. 删除现有表
DROP TABLE IF EXISTS act_credit_purchases;

-- 3. 重新创建优化的积分流水表
CREATE TABLE act_credit_purchases (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES act_users(id) ON DELETE CASCADE,
    
    -- 交易基本信息
    transaction_type VARCHAR(50) NOT NULL DEFAULT 'purchase', -- purchase, subscription, bonus, refund, etc.
    transaction_status VARCHAR(30) NOT NULL DEFAULT 'completed', -- pending, completed, failed, refunded
    
    -- 积分信息
    credits_amount INTEGER NOT NULL, -- 积分数量（正数为获得，负数为消费）
    balance_before INTEGER NOT NULL DEFAULT 0, -- 交易前余额
    balance_after INTEGER NOT NULL DEFAULT 0, -- 交易后余额
    
    -- 支付信息
    amount_paid DECIMAL(10,2) DEFAULT 0, -- 支付金额
    currency VARCHAR(3) DEFAULT 'USD', -- 货币类型
    payment_method VARCHAR(50) DEFAULT 'stripe', -- 支付方式
    payment_status VARCHAR(30) DEFAULT 'completed', -- 支付状态
    
    -- 套餐/产品信息
    package_id VARCHAR(100), -- 套餐ID
    package_name VARCHAR(200), -- 套餐名称
    package_type VARCHAR(50), -- 套餐类型：monthly, yearly, one_time
    
    -- 交易标识
    transaction_id VARCHAR(100) UNIQUE, -- Stripe交易ID
    session_id VARCHAR(100), -- Stripe会话ID
    reference_id VARCHAR(100), -- 内部参考ID
    
    -- 描述信息
    description TEXT, -- 交易描述
    notes TEXT, -- 备注信息
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 索引
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES act_users(id) ON DELETE CASCADE
);

-- 4. 创建索引以提高查询性能
CREATE INDEX idx_act_credit_purchases_user_id ON act_credit_purchases(user_id);
CREATE INDEX idx_act_credit_purchases_created_at ON act_credit_purchases(created_at);
CREATE INDEX idx_act_credit_purchases_transaction_type ON act_credit_purchases(transaction_type);
CREATE INDEX idx_act_credit_purchases_transaction_id ON act_credit_purchases(transaction_id);
CREATE INDEX idx_act_credit_purchases_status ON act_credit_purchases(transaction_status);

-- 5. 创建触发器自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_act_credit_purchases_updated_at 
    BEFORE UPDATE ON act_credit_purchases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. 添加表注释
COMMENT ON TABLE act_credit_purchases IS '积分流水表 - 记录所有积分相关的交易';
COMMENT ON COLUMN act_credit_purchases.transaction_type IS '交易类型：purchase(购买), subscription(订阅), bonus(奖励), consumption(消费), refund(退款)';
COMMENT ON COLUMN act_credit_purchases.credits_amount IS '积分数量：正数表示获得积分，负数表示消费积分';
COMMENT ON COLUMN act_credit_purchases.balance_before IS '交易前积分余额';
COMMENT ON COLUMN act_credit_purchases.balance_after IS '交易后积分余额';

-- 7. 插入示例数据（可选）
-- INSERT INTO act_credit_purchases (
--     user_id, transaction_type, credits_amount, balance_before, balance_after,
--     amount_paid, package_name, package_type, description
-- ) VALUES (
--     'c6cf518d-4be5-48c3-a3a1-e3c54423f591', 'subscription', 1300, 50, 1350,
--     39.90, 'Act-2-AI 基础版月付', 'monthly', '订阅套餐积分'
-- ); 