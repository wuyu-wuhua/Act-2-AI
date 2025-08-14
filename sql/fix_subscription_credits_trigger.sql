-- 修复订阅积分触发器 - 确保活跃订阅不会被错误清零

-- 删除现有触发器
DROP TRIGGER IF EXISTS auto_cleanup_subscription_credits_trigger ON act_users;

-- 创建修复后的触发器函数
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
        RAISE NOTICE '触发器自动清零订阅积分: 用户=%, 状态=%, 结束时间=%, 原因=%, 清零积分=%, 保留充值积分=%', 
            NEW.id, NEW.subscription_status, NEW.subscription_end_date, v_clear_reason, NEW.subscription_credits, COALESCE(NEW.recharge_credits, 0);
        
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
            '触发器自动清零过期订阅积分 (原因: ' || v_clear_reason || ', 状态: ' || NEW.subscription_status || ')',
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

-- 重新创建触发器，只在真正需要时触发
CREATE TRIGGER auto_cleanup_subscription_credits_trigger
    BEFORE UPDATE ON act_users
    FOR EACH ROW
    WHEN (
        -- 只有在订阅相关字段发生变化且不是活跃状态时才触发
        (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status OR
         OLD.subscription_end_date IS DISTINCT FROM NEW.subscription_end_date) AND
        NEW.subscription_status != 'active' AND
        NEW.subscription_credits > 0
    )
    EXECUTE FUNCTION trigger_cleanup_expired_subscription_credits();

-- 显示完成信息
SELECT '订阅积分触发器已修复完成' as status;
SELECT '现在触发器只会在以下情况清零订阅积分:' as info;
SELECT '1. 订阅状态变为 expired' as condition1;
SELECT '2. 订阅状态为 canceled/cancelled/past_due 且确实已过期' as condition2;
SELECT '3. 订阅状态为 unpaid 且确实已过期' as condition3;
SELECT '重要：活跃订阅 (active) 的积分绝不会被清零' as important_note;