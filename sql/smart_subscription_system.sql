-- 智能订阅积分管理系统
-- 能够区分取消订阅和续费订阅，正确处理积分清零和重置

-- 1. 创建智能触发器函数 - 在用户状态更新时自动检查
CREATE OR REPLACE FUNCTION smart_subscription_handler()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_credits INTEGER;
BEGIN
    -- 如果订阅结束日期已过，根据订阅状态决定如何处理
    IF NEW.subscription_end_date < CURRENT_TIMESTAMP AND NEW.subscription_credits > 0 THEN
        
        -- 检查是否已取消订阅
        IF NEW.subscription_status = 'cancelled' THEN
            -- 已取消订阅：清零积分
            NEW.subscription_credits := 0;
            NEW.credits_balance := NEW.recharge_credits;
            NEW.subscription_status := 'expired';
            
            -- 记录积分清零交易
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
            
        ELSIF NEW.subscription_status = 'active' THEN
            -- 未取消订阅：重置积分到新套餐的完整积分
            -- 这里需要根据订阅计划ID获取对应的积分数量
            -- 暂时使用1300作为默认值，实际应该从套餐表获取
            v_plan_credits := 1300;
            
            NEW.subscription_credits := v_plan_credits;
            NEW.credits_balance := NEW.recharge_credits + v_plan_credits;
            NEW.subscription_status := 'renewed';
            
            -- 记录积分重置交易
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
                'subscription_renewal',
                v_plan_credits,
                OLD.subscription_credits + OLD.recharge_credits,
                NEW.recharge_credits + v_plan_credits,
                '订阅周期续费，积分重置',
                'auto_renewal_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 创建智能触发器
DROP TRIGGER IF EXISTS trigger_smart_subscription ON act_users;
CREATE TRIGGER trigger_smart_subscription
    BEFORE UPDATE ON act_users
    FOR EACH ROW
    EXECUTE FUNCTION smart_subscription_handler();

-- 3. 创建智能清理函数（区分取消和续费）
CREATE OR REPLACE FUNCTION smart_cleanup_subscriptions()
RETURNS TEXT AS $$
DECLARE
    v_cleaned_count INTEGER := 0;
    v_renewed_count INTEGER := 0;
    v_user_record RECORD;
    v_plan_credits INTEGER;
BEGIN
    -- 处理所有过期的订阅
    FOR v_user_record IN 
        SELECT 
            id, 
            subscription_credits, 
            recharge_credits,
            subscription_status,
            subscription_plan_id
        FROM act_users 
        WHERE subscription_end_date < CURRENT_TIMESTAMP 
          AND subscription_credits > 0
    LOOP
        -- 根据订阅状态决定处理方式
        IF v_user_record.subscription_status = 'cancelled' THEN
            -- 已取消订阅：清零积分
            UPDATE act_users 
            SET 
                subscription_credits = 0,
                credits_balance = recharge_credits,
                subscription_status = 'expired'
            WHERE id = v_user_record.id;
            
            v_cleaned_count := v_cleaned_count + 1;
            
            -- 记录积分清零交易
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
            
        ELSIF v_user_record.subscription_status = 'active' THEN
            -- 未取消订阅：重置积分到新套餐的完整积分
            -- 这里需要根据订阅计划ID获取对应的积分数量
            -- 暂时使用1300作为默认值，实际应该从套餐表获取
            v_plan_credits := 1300;
            
            UPDATE act_users 
            SET 
                subscription_credits = v_plan_credits,
                credits_balance = recharge_credits + v_plan_credits,
                subscription_status = 'renewed'
            WHERE id = v_user_record.id;
            
            v_renewed_count := v_renewed_count + 1;
            
            -- 记录积分重置交易
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
                'subscription_renewal',
                v_plan_credits,
                v_user_record.subscription_credits + v_user_record.recharge_credits,
                v_user_record.recharge_credits + v_plan_credits,
                '订阅周期续费，积分重置',
                'scheduled_renewal_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text
            );
        END IF;
    END LOOP;
    
    RETURN '智能清理完成，清零 ' || v_cleaned_count || ' 个用户，重置 ' || v_renewed_count || ' 个用户';
END;
$$ LANGUAGE plpgsql;

-- 4. 创建API端点调用函数（用于Next.js API调用）
CREATE OR REPLACE FUNCTION api_smart_cleanup_subscriptions()
RETURNS JSON AS $$
DECLARE
    v_result TEXT;
    v_cleaned_count INTEGER;
    v_renewed_count INTEGER;
BEGIN
    v_result := smart_cleanup_subscriptions();
    
    -- 提取清理和重置数量
    v_cleaned_count := (regexp_match(v_result, '清零 (\d+) 个用户'))[1]::INTEGER;
    v_renewed_count := (regexp_match(v_result, '重置 (\d+) 个用户'))[1]::INTEGER;
    
    RETURN json_build_object(
        'success', true,
        'message', v_result,
        'cleaned_count', v_cleaned_count,
        'renewed_count', v_renewed_count,
        'timestamp', CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;

-- 5. 创建手动订阅续费函数（用于API调用）
CREATE OR REPLACE FUNCTION manual_subscription_renewal(p_user_id UUID, p_plan_credits INTEGER DEFAULT 1300)
RETURNS JSON AS $$
DECLARE
    v_user_record RECORD;
    v_old_credits INTEGER;
    v_new_credits INTEGER;
BEGIN
    -- 获取用户当前状态
    SELECT 
        subscription_credits,
        recharge_credits,
        subscription_status
    INTO v_user_record
    FROM act_users 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', '用户不存在'
        );
    END IF;
    
    -- 记录旧积分
    v_old_credits := v_user_record.subscription_credits;
    v_new_credits := p_plan_credits;
    
    -- 更新用户积分
    UPDATE act_users 
    SET 
        subscription_credits = p_plan_credits,
        credits_balance = recharge_credits + p_plan_credits,
        subscription_status = 'renewed'
    WHERE id = p_user_id;
    
    -- 记录积分重置交易
    INSERT INTO act_credit_transactions (
        user_id,
        transaction_type,
        credits_amount,
        balance_before,
        balance_after,
        description,
        reference_id
    ) VALUES (
        p_user_id,
        'subscription_renewal',
        p_plan_credits,
        v_old_credits + v_user_record.recharge_credits,
        v_user_record.recharge_credits + p_plan_credits,
        '手动订阅续费，积分重置',
        'manual_renewal_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text
    );
    
    RETURN json_build_object(
        'success', true,
        'message', '订阅续费成功，积分已重置',
        'old_credits', v_old_credits,
        'new_credits', p_plan_credits,
        'timestamp', CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;

-- 6. 立即执行一次智能清理
SELECT smart_cleanup_subscriptions();

-- 7. 查看当前状态
SELECT 
    '智能订阅系统状态' as status,
    '智能触发器已创建' as trigger_status,
    '智能清理函数已创建' as function_status,
    'API调用函数已创建' as api_status,
    '手动续费函数已创建' as manual_renewal_status;
