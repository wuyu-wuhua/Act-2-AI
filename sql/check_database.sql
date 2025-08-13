-- 检查数据库表状态
-- 在Supabase控制台执行此脚本来验证表是否正确创建

-- 1. 检查所有act_开头的表
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name LIKE 'act_%' 
ORDER BY table_name;

-- 2. 检查act_users表的结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'act_users' 
ORDER BY ordinal_position;

-- 3. 检查act_credit_transactions表的结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'act_credit_transactions' 
ORDER BY ordinal_position;

-- 4. 检查外键约束
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name LIKE 'act_%';

-- 5. 检查是否有数据
SELECT 'act_users' as table_name, COUNT(*) as row_count FROM act_users
UNION ALL
SELECT 'act_credit_transactions' as table_name, COUNT(*) as row_count FROM act_credit_transactions
UNION ALL
SELECT 'act_credit_packages' as table_name, COUNT(*) as row_count FROM act_credit_packages;

-- 6. 检查触发器
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE event_object_table LIKE 'act_%'
ORDER BY event_object_table, trigger_name; 