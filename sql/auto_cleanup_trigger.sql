-- 创建自动清理过期订阅积分的触发器系统
-- 当订阅状态或结束日期发生变化时，自动检查并清理过期积分

-- 首先创建自动清理函数
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_subscription_credits()
RETURNS TRIGGER AS $$
DECLARE
    v_now TIMESTAMP := CURRENT_TIMESTAMP;
    v_should_clear BOOLEAN := FALSE;
    v_clear_reason TEXT := '';
BEGIN
    -- 只有在订阅积分 > 0 时才需要检查
    IF NEW.subscription_credits <= 0 THEN
        RETURN NEW;
    END IF;
    
    -- 🔧 修复：只有在明确的过期情况下才清零积分
    -- 绝不清零活跃订阅的积分
    
    -- 保护：绝不清零活跃订阅
    IF NEW.subscription_status = 'active' THEN
        RETURN NEW; -- 直接返回，不做任何清零操作
    END IF;
    
    -- 条件1: 订阅状态为expired
    IF NEW.subscription_status = 'expired' THEN
        v_should_clear := TRUE;
        v_clear_reason := 'status_expired';
    
    -- 条件2: 订阅状态为canceled/cancelled/past_due且订阅确实已过期
    ELSIF NEW.subscription_status IN ('canceled', 'cancelled', 'past_due') 
          AND NEW.subscription_end_date IS NOT NULL 
          AND NEW.subscription_end_date <= v_now THEN
        v_should_clear := TRUE;
        v_clear_reason := 'canceled_and_expired';
    
    -- 条件3: 订阅状态为unpaid且已过期
    ELSIF NEW.subscription_status = 'unpaid'
          AND NEW.subscription_end_date IS NOT NULL 
          AND NEW.subscription_end_date <= v_now THEN
        v_should_clear := TRUE;
        v_clear_reason := 'unpaid_and_expired';
    END IF;
    
    -- 如果需要清零，执行清零操作
    IF v_should_clear THEN
        -- 记录日志信息
        RAISE NOTICE '触发器自动清零订阅积分: 用户=%, 原因=%, 清零积分=%, 保留充值积分=%', 
            NEW.id, v_clear_reason, NEW.subscription_credits, COALESCE(NEW.recharge_credits, 0);
        
        -- 记录积分清零交易历史
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
            'refund',
            -NEW.subscription_credits,
            NEW.credits_balance,
            COALESCE(NEW.recharge_credits, 0),
            '触发器自动清零过期订阅积分 (原因: ' || v_clear_reason || ')',
            'trigger_cleanup_' || EXTRACT(EPOCH FROM v_now)::text
        );
        
        -- 清零订阅积分，保留充值积分，更新状态
        NEW.subscription_credits := 0;
        NEW.credits_balance := COALESCE(NEW.recharge_credits, 0);
        NEW.subscription_status := 'expired';
        NEW.updated_at := v_now;
    END IF;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        -- 记录错误但不阻止操作
        RAISE WARNING '触发器清零订阅积分时出错: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除已存在的触发器（如果有）
DROP TRIGGER IF EXISTS auto_cleanup_subscription_credits_trigger ON act_users;

-- 创建触发器
CREATE TRIGGER auto_cleanup_subscription_credits_trigger
    BEFORE UPDATE ON act_users
    FOR EACH ROW
    WHEN (
        -- 只有在订阅相关字段发生变化时才触发
        OLD.subscription_status IS DISTINCT FROM NEW.subscription_status OR
        OLD.subscription_end_date IS DISTINCT FROM NEW.subscription_end_date OR
        OLD.subscription_credits IS DISTINCT FROM NEW.subscription_credits
    )
    EXECUTE FUNCTION trigger_cleanup_expired_subscription_credits();

-- 创建定时清理函数（可以通过cron或定时任务调用）
CREATE OR REPLACE FUNCTION scheduled_cleanup_expired_subscriptions()
RETURNS TEXT AS $$
DECLARE
    v_result TEXT := '';
    v_cleaned_count INTEGER := 0;
    v_user_record RECORD;
    v_now TIMESTAMP := CURRENT_TIMESTAMP;
BEGIN
    -- 查找所有需要清零的用户
    FOR v_user_record IN 
        SELECT id, subscription_credits, recharge_credits, subscription_status, subscription_end_date, credits_balance
        FROM act_users 
        WHERE subscription_credits > 0
          AND (
              -- 状态为expired
              subscription_status = 'expired'
              OR
              -- 已取消且已过期
              (subscription_status IN ('canceled', 'cancelled', 'past_due') 
               AND subscription_end_date IS NOT NULL 
               AND subscription_end_date <= v_now)
              OR
              -- 有结束日期且已过期
              (subscription_end_date IS NOT NULL 
               AND subscription_end_date <= v_now 
               AND subscription_status NOT IN ('active'))
          )
    LOOP
        -- 清零订阅积分，保留充值积分
        UPDATE act_users 
        SET subscription_credits = 0,
            credits_balance = COALESCE(recharge_credits, 0),
            subscription_status = 'expired',
            updated_at = v_now
        WHERE id = v_user_record.id;
        
        -- 记录交易历史
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
            'refund',
            -v_user_record.subscription_credits,
            v_user_record.credits_balance,
            COALESCE(v_user_record.recharge_credits, 0),
            '定时任务自动清理过期订阅积分',
            'scheduled_cleanup_' || EXTRACT(EPOCH FROM v_now)::text
        );
        
        v_cleaned_count := v_cleaned_count + 1;
        v_result := v_result || '用户 ' || v_user_record.id || ' 清零订阅积分 ' || v_user_record.subscription_credits || '; ';
    END LOOP;
    
    v_result := '定时清理完成于 ' || v_now || '. 共清理 ' || v_cleaned_count || ' 个用户. ' || v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 创建手动批量清理函数
CREATE OR REPLACE FUNCTION manual_cleanup_all_expired_subscriptions()
RETURNS TEXT AS $$
DECLARE
    v_result TEXT;
BEGIN
    -- 直接调用定时清理函数
    SELECT scheduled_cleanup_expired_subscriptions() INTO v_result;
    RETURN '手动执行清理: ' || v_result;
END;
$$ LANGUAGE plpgsql;

-- 显示完成信息
SELECT '自动清理触发器系统已创建完成' as status;

-- 显示可用函数
SELECT '可用的清理函数:' as info;
SELECT 'SELECT scheduled_cleanup_expired_subscriptions();' as scheduled_cleanup;
SELECT 'SELECT manual_cleanup_all_expired_subscriptions();' as manual_cleanup;

-- 测试触发器（可选）
-- 你可以通过更新一个用户的订阅状态来测试触发器是否工作
-- 例如: UPDATE act_users SET subscription_status = 'expired' WHERE id = '某个用户ID' AND subscription_credits > 0;