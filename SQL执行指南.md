# SQL执行指南

## 问题分析

您遇到的错误主要有两个：

1. **`act_credit_transactions` 表不存在** - 这是因为原始SQL文件试图引用不存在的表
2. **`google_full_name` 字段不存在** - 这是因为视图创建时引用了不存在的字段

## 解决方案

### 方法一：使用简化迁移脚本（推荐）

**步骤：**

1. **登录Supabase控制台**
   - 进入您的项目
   - 点击左侧菜单的 "SQL Editor"

2. **执行简化迁移脚本**
   - 复制 `simple_migration.sql` 的全部内容
   - 粘贴到SQL编辑器中
   - 点击 "Run" 执行

3. **验证执行结果**
   - 应该看到 "Migration completed successfully!" 消息
   - 检查左侧的 "Table Editor" 确认表已创建

### 方法二：分步执行

如果方法一有问题，可以分步执行：

**第一步：创建基础表结构**
```sql
-- 1. 确保用户表有必要的字段
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_users' AND column_name = 'google_full_name') THEN
        ALTER TABLE act_users ADD COLUMN google_full_name VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'act_users' AND column_name = 'credits_balance') THEN
        ALTER TABLE act_users ADD COLUMN credits_balance INTEGER DEFAULT 0;
    END IF;
END $$;
```

**第二步：创建积分交易记录表**
```sql
-- 2. 创建积分交易记录表
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
```

**第三步：创建积分包表**
```sql
-- 3. 创建积分包表
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
```

**第四步：插入默认数据**
```sql
-- 4. 插入默认积分包数据
INSERT INTO act_credit_packages (package_name, package_description, price, credits_amount, is_popular, is_best_value)
SELECT * FROM (VALUES 
    ('基础积分包', '适合轻度使用', 39.9, 1000, FALSE, FALSE),
    ('标准积分包', '适合日常使用', 69.9, 2000, TRUE, TRUE),
    ('高级积分包', '适合专业用户', 99.9, 3600, FALSE, FALSE)
) AS v(package_name, package_description, price, credits_amount, is_popular, is_best_value)
WHERE NOT EXISTS (SELECT 1 FROM act_credit_packages);
```

## 验证步骤

执行完成后，请验证：

1. **检查表是否创建成功**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name LIKE 'act_%' 
   ORDER BY table_name;
   ```

2. **检查字段是否存在**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'act_users' 
   ORDER BY column_name;
   ```

3. **测试积分系统**
   - 使用新账号登录
   - 检查是否自动获得50积分
   - 查看个人中心页面

## 常见问题

### Q: 执行时提示权限错误
A: 确保您有足够的数据库权限，通常项目所有者有完整权限

### Q: 表已存在错误
A: 使用 `IF NOT EXISTS` 的脚本可以避免这个问题

### Q: 字段已存在错误
A: 脚本中的 `DO $$` 块会检查字段是否存在，不会重复添加

### Q: 外键约束错误
A: 确保先创建被引用的表，再创建引用表

## 注意事项

1. **备份数据**：虽然这个脚本不会删除数据，但建议先备份重要数据
2. **测试环境**：建议先在测试环境中验证
3. **逐步执行**：如果遇到问题，可以分步执行并检查每步的结果

## 联系支持

如果仍然遇到问题，请提供：
1. 具体的错误信息
2. 执行到哪一步时出错
3. 当前的数据库表结构 