-- 改进的订阅取消函数
-- 支持立即取消订阅积分清零

-- 创建或替换订阅取消函数
CREATE OR REPLACE FUNCTION cancel_subscription(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_user_record RECORD;
    v_result TEXT := '';
BEGIN
    -- 获取用户当前订阅信息
    SELECT 
        id, 
        subscription_status, 
        subscription_end_date, 
        subscription_credits, 
        recharge_credits, 
        credits_balance,
        stripe_subscription_id
    INTO v_user_record
    FROM act_users 
    WHERE id = p_user_id;
    
    -- 检查用户是否存在
    IF NOT FOUND THEN
        RETURN '用户不存在';
    END IF;
    
    -- 检查订阅状态
    IF v_user_record.subscription_status != 'active' THEN
        RETURN '用户当前没有活跃的订阅';
    END IF;
    
    -- 检查是否立即取消（订阅结束时间小于等于当前时间）
    IF v_user_record.subscription_end_date <= CURRENT_TIMESTAMP THEN
        -- 立即取消：清零订阅积分，保留充值积分
        UPDATE act_users 
        SET 
            subscription_status = 'cancelled',
            subscription_credits = 0,
            credits_balance = v_user_record.recharge_credits,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_user_id;
        
        -- 记录积分清零交易
        IF v_user_record.subscription_credits > 0 THEN
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
                'refund',
                -v_user_record.subscription_credits,
                v_user_record.credits_balance,
                v_user_record.recharge_credits,
                '订阅立即取消，积分清零',
                'cancel_immediate_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text
            );
        END IF;
        
        v_result := '订阅已立即取消，订阅积分已清零 (' || v_user_record.subscription_credits || ')，充值积分已保留 (' || v_user_record.recharge_credits || ')';
        
    ELSE
        -- 在周期结束时取消：标记为已取消，但不立即清零积分
        UPDATE act_users 
        SET 
            subscription_status = 'cancelled',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_user_id;
        
        -- 计算剩余天数
        DECLARE
            v_days_remaining INTEGER;
        BEGIN
            v_days_remaining := CEIL(EXTRACT(EPOCH FROM (v_user_record.subscription_end_date - CURRENT_TIMESTAMP)) / 86400);
            
            v_result := '订阅已取消，将在 ' || v_days_remaining || ' 天后过期。过期时订阅积分 (' || v_user_record.subscription_credits || ') 将被清零，充值积分 (' || v_user_record.recharge_credits || ') 将保留';
        END;
    END IF;
    
    -- 记录取消操作
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
        'bonus', -- 使用允许的transaction_type
        0,
        v_user_record.credits_balance,
        v_user_record.credits_balance,
        '订阅取消操作: ' || v_result,
        'cancel_subscription_' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN '取消订阅时发生错误: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 创建检查订阅状态的函数
CREATE OR REPLACE FUNCTION check_subscription_status(p_user_id UUID)
RETURNS TABLE(
    user_id UUID,
    subscription_status VARCHAR,
    subscription_end_date TIMESTAMP,
    subscription_credits INTEGER,
    recharge_credits INTEGER,
    credits_balance INTEGER,
    days_until_expiry INTEGER,
    can_cancel BOOLEAN,
    status_description TEXT
) AS $$
DECLARE
    v_user_record RECORD;
    v_days_remaining INTEGER;
    v_status_desc TEXT;
BEGIN
    -- 获取用户订阅信息
    SELECT 
        id, 
        act_users.subscription_status, 
        act_users.subscription_end_date, 
        act_users.subscription_credits, 
        act_users.recharge_credits, 
        act_users.credits_balance
    INTO v_user_record
    FROM act_users 
    WHERE act_users.id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- 计算剩余天数
    IF v_user_record.subscription_end_date IS NOT NULL THEN
        v_days_remaining := CEIL(EXTRACT(EPOCH FROM (v_user_record.subscription_end_date - CURRENT_TIMESTAMP)) / 86400);
    ELSE
        v_days_remaining := NULL;
    END IF;
    
    -- 生成状态描述
    CASE v_user_record.subscription_status
        WHEN 'active' THEN
            IF v_days_remaining > 0 THEN
                v_status_desc := '订阅活跃，' || v_days_remaining || '天后到期';
            ELSE
                v_status_desc := '订阅已到期，等待系统处理';
            END IF;
        WHEN 'cancelled' THEN
            IF v_days_remaining > 0 THEN
                v_status_desc := '订阅已取消，' || v_days_remaining || '天后积分清零';
            ELSE
                v_status_desc := '订阅已取消且已过期，积分应已清零';
            END IF;
        WHEN 'expired' THEN
            v_status_desc := '订阅已过期，积分已清零';
        ELSE
            v_status_desc := '订阅状态: ' || COALESCE(v_user_record.subscription_status, '未知');
    END CASE;
    
    RETURN QUERY SELECT 
        v_user_record.id,
        v_user_record.subscription_status,
        v_user_record.subscription_end_date,
        v_user_record.subscription_credits,
        v_user_record.recharge_credits,
        v_user_record.credits_balance,
        v_days_remaining,
        (v_user_record.subscription_status = 'active')::BOOLEAN,
        v_status_desc;
END;
$$ LANGUAGE plpgsql;

-- 测试函数
SELECT '订阅取消函数已更新' as status;

-- 显示使用示例
SELECT '使用示例:' as info;
SELECT 'SELECT cancel_subscription(''用户UUID'');' as example1;
SELECT 'SELECT * FROM check_subscription_status(''用户UUID'');' as example2;