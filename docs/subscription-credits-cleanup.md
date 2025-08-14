# 订阅积分清零系统说明

## 概述

本系统实现了订阅到期后积分自动清零的功能。当用户取消订阅且订阅周期结束后，系统会自动清零订阅积分，但保留充值积分。

## 核心逻辑

### 积分清零条件
- **订阅状态**：`cancelled`（已取消）
- **时间条件**：当前时间 >= 订阅结束时间
- **积分条件**：订阅积分 > 0

### 清零规则
- ✅ **清零**：订阅积分（subscription_credits）
- ✅ **保留**：充值积分（recharge_credits）
- ✅ **更新**：总积分余额 = 充值积分
- ✅ **状态**：订阅状态更新为 `expired`

## API端点

### 1. 检查订阅到期状态
```http
POST /api/subscription/check-expired
```

**请求体：**
```json
{
  "userId": "用户ID"
}
```

**响应：**
```json
{
  "success": true,
  "needsCleanup": true,
  "subscriptionCredits": 2600,
  "rechargeCredits": 50,
  "actionTaken": "订阅已取消且周期结束，需要清零订阅积分"
}
```

### 2. 执行积分清零
```http
PUT /api/subscription/check-expired
```

**请求体：**
```json
{
  "userId": "用户ID"
}
```

**响应：**
```json
{
  "success": true,
  "action": "积分清零完成",
  "clearedSubscriptionCredits": 2600,
  "remainingRechargeCredits": 50,
  "newCreditsBalance": 50
}
```

### 3. 强制检查订阅状态
```http
POST /api/subscription/force-check
```

### 4. 订阅清理（批量）
```http
POST /api/subscription/cleanup
```

## 前端功能

### 个人中心页面
在个人中心页面，当用户订阅状态为 `cancelled` 时，会显示两个按钮：

1. **检查到期**：检查订阅是否已到期，如果到期会提示是否清零积分
2. **检查状态**：强制检查订阅状态和积分

### 积分显示
- 显示距离积分清零的天数
- 当订阅已取消且过期时，显示"积分已清零"状态

## 自动清理

### 定时任务脚本
```bash
# 手动运行
node scripts/auto-cleanup-expired-subscriptions.js

# 添加到cron（每天凌晨2点执行）
0 2 * * * cd /path/to/project && node scripts/auto-cleanup-expired-subscriptions.js
```

### 自动清理逻辑
1. 查找所有已取消且已过期的订阅
2. 自动清零订阅积分
3. 保留充值积分
4. 更新订阅状态为 `expired`
5. 记录交易历史

## 数据库字段

### act_users表
- `subscription_status`: 订阅状态
- `subscription_end_date`: 订阅结束时间
- `subscription_credits`: 订阅积分
- `recharge_credits`: 充值积分
- `credits_balance`: 总积分余额

### act_credit_transactions表
- `transaction_type`: 交易类型（`subscription_expiry`）
- `credits_amount`: 积分变动数量（负数表示清零）
- `description`: 交易描述

## 使用场景

### 场景1：用户取消订阅
1. 用户取消订阅，状态变为 `cancelled`
2. 订阅继续有效到当前周期结束
3. 周期结束后，订阅积分自动清零
4. 充值积分保持不变

### 场景2：手动检查
1. 用户点击"检查到期"按钮
2. 系统检查订阅状态
3. 如果符合清零条件，提示用户确认
4. 用户确认后执行积分清零

### 场景3：自动清理
1. 定时任务每天检查过期订阅
2. 自动清零符合条件的订阅积分
3. 记录清理日志和交易历史

## 安全考虑

- 只有已取消且过期的订阅才会被清零
- 充值积分永远不会被清零
- 所有操作都会记录详细的交易历史
- 支持手动和自动两种清理方式

## 监控和日志

- 所有积分清零操作都会记录日志
- 交易历史包含清零前后的积分状态
- 支持实时监控和手动触发
- 错误处理和异常恢复机制

## 测试

### 测试脚本
```bash
# 测试订阅到期检查
curl -X POST http://localhost:3000/api/subscription/check-expired \
  -H "Content-Type: application/json" \
  -d '{"userId": "测试用户ID"}'

# 测试积分清零
curl -X PUT http://localhost:3000/api/subscription/check-expired \
  -H "Content-Type: application/json" \
  -d '{"userId": "测试用户ID"}'
```

### 测试数据
确保测试用户有以下状态：
- `subscription_status`: `cancelled`
- `subscription_end_date`: 过去的日期
- `subscription_credits`: > 0
- `recharge_credits`: > 0

## 故障排除

### 常见问题
1. **积分未清零**：检查订阅状态和结束时间
2. **充值积分被清零**：检查代码逻辑，确保只清零订阅积分
3. **交易历史缺失**：检查数据库连接和权限

### 调试方法
1. 查看控制台日志
2. 检查数据库中的用户状态
3. 验证API响应
4. 手动运行清理脚本

## 总结

本系统提供了完整的订阅积分清零解决方案，确保：
- 订阅到期后积分自动清零
- 充值积分永久保留
- 支持手动和自动清理
- 完整的操作记录和监控
- 安全的权限控制

通过这套系统，可以有效管理订阅用户的积分，避免积分滥用，同时保护用户的充值权益。
