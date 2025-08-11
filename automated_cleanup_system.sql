-- 自动化订阅积分清理系统
-- 创建触发器和自动清理机制

-- 1. 创建触发器函数 - 在用户状态更新时自动检查
CREATE OR REPLACE FUNCTION auto_check_subscription_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果订阅结束日期已过，自动清理积分
    IF NEW.subscription_end_date < CURRENT_TIMESTAMP AND NEW.subscription_credits > 0 THEN
        NEW.subscription_credits := 0;
        NEW.credits_balance := NEW.recharge_credits;
        NEW.subscription_status := 'expired';
        
        -- 记录自动清理交易
        INSERT INTO act_credit_transactions (
            user_id,
            transaction_type,
            credits_amount,
            balance_before,
            balance_after,
            description,
            reference_id
        ) VALUES (
            NEW.id,
            'subscription_expiry',
            -OLD.subscription_credits,
            OLD.subscription_credits + OLD.recharge_credits,
            NEW.recharge_credits,
            '订阅周期结束，积分清零',
            'auto_cleanup_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 创建触发器
DROP TRIGGER IF EXISTS trigger_auto_cleanup ON act_users;
CREATE TRIGGER trigger_auto_cleanup
    BEFORE UPDATE ON act_users
    FOR EACH ROW
    EXECUTE FUNCTION auto_check_subscription_expiry();

-- 3. 创建定时清理函数（可以手动调用或设置定时任务）
CREATE OR REPLACE FUNCTION auto_cleanup_expired_subscriptions()
RETURNS TEXT AS $$
DECLARE
    v_cleaned_count INTEGER := 0;
    v_user_record RECORD;
BEGIN
    -- 清理所有过期的订阅积分
    FOR v_user_record IN 
        SELECT 
            id, 
            subscription_credits, 
            recharge_credits
        FROM act_users 
        WHERE subscription_end_date < CURRENT_TIMESTAMP 
          AND subscription_credits > 0
    LOOP
        -- 清零订阅积分
        UPDATE act_users 
        SET 
            subscription_credits = 0,
            credits_balance = recharge_credits,
            subscription_status = 'expired'
        WHERE id = v_user_record.id;
        
        v_cleaned_count := v_cleaned_count + 1;
        
        -- 记录清理交易
        INSERT INTO act_credit_transactions (
            user_id,
            transaction_type,
            credits_amount,
            balance_before,
            balance_after,
            description,
            reference_id
        ) VALUES (
            v_user_record.id,
            'subscription_expiry',
            -v_user_record.subscription_credits,
            v_user_record.subscription_credits + v_user_record.recharge_credits,
            v_user_record.recharge_credits,
            '订阅周期结束，积分清零',
            'scheduled_cleanup_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text
        );
    END LOOP;
    
    RETURN '自动清理完成，共清理 ' || v_cleaned_count || ' 个用户';
END;
$$ LANGUAGE plpgsql;

-- 4. 创建API端点调用函数（用于Next.js API调用）
CREATE OR REPLACE FUNCTION api_cleanup_subscriptions()
RETURNS JSON AS $$
DECLARE
    v_result TEXT;
    v_cleaned_count INTEGER;
BEGIN
    v_result := auto_cleanup_expired_subscriptions();
    
    -- 提取清理数量
    v_cleaned_count := (regexp_match(v_result, '共清理 (\d+) 个用户'))[1]::INTEGER;
    
    RETURN json_build_object(
        'success', true,
        'message', v_result,
        'cleaned_count', v_cleaned_count,
        'timestamp', CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;

-- 5. 立即执行一次清理
SELECT auto_cleanup_expired_subscriptions();

-- 6. 查看当前状态
SELECT 
    '自动化系统状态' as status,
    '触发器已创建' as trigger_status,
    '定时清理函数已创建' as function_status,
    'API调用函数已创建' as api_status;
