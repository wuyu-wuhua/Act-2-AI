-- 详细检查act_credit_transactions表的所有约束和结构
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'act_credit_transactions'::regclass
ORDER BY conname;

-- 检查表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'act_credit_transactions'
ORDER BY ordinal_position;

-- 检查是否有触发器
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'act_credit_transactions'; 