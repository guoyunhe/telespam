# 更新日志

项目的所有重要变更都将记录在此文件中。

## [Unreleased]

### 新增

- `keywordBlacklist` 现支持正则表达式。用 `/` 包裹模式（如 `/^spam\d+$/`）即可使用正则匹配，而非普通子串匹配。

## [0.7.0] - 2026-08-27

### 新增

- 重试工具（`@guoyunhe/retry`），用于 Telegram API 调用，含错误日志。
- 每日统计数据持久化到临时文件（`/tmp/telespam-stats-<bot>.json`），进程意外重启后数据不丢失。

### 变更

- 改进消息删除的错误处理。
- 改进日志格式，加入群组名和用户名。
- 拒绝消息模板迁移到语言文件。

## [0.6.0] - 2026-08-25

### 新增

- `telespam restart` 命令，用于重启 systemd 用户服务。
- `telespam logs` 命令，用于查看实时服务日志。

## [0.5.0] - 2026-08-25

### 变更

- **破坏性变更**：`nameKeywordBlacklist` 和 `bioKeywordBlacklist` 合并为单一的 `keywordBlacklist`，同时应用于名称和简介字段。

## [0.4.0] - 2026-08-25

### 新增

- 多步验证：`verification` 现支持配置问题数组，实现多问题验证流程。
- 验证问题选项顺序随机排列。

### 修复

- `pendingVerifications` 改用组合键 `chatId:userId`，同一用户可在多个群组中同时验证。

## [0.3.0] - 2026-08-24

### 新增

- 多实例支持：配置文件可以是 bot 配置的数组。
- 基于 `commander` 的命令行，支持 `--version` / `--help` 参数。
- `botName` 现在通过 Telegram API (`getMe()`) 自动获取。
- 日志消息包含 `[@bot用户名] [群组名]` 前缀，便于多实例区分。

### 变更

- 将配置加载相关函数提取到 `src/config.ts`。
- 合并重复的 `Config` 接口与 `TelespamOptions`。
- 日志消息使用硬编码英文，不再使用 i18n 翻译。

### 移除

- 从配置选项中移除 `botName`（改为通过 API 自动检测）。

## [0.2.0] - 2026-08-24

### 新增

- 每日零点向各群组发送统计报告。
- 黑名单拆分为 `nameKeywordBlacklist`（名称黑名单）和 `bioKeywordBlacklist`（简介黑名单）。

### 修复

- 全名组合（`first_name` + `last_name`）。

## [0.1.1] - 2026-08-23

### 修复

- 构建输出配置。

## [0.1.0] - 2026-08-23

### 新增

- 自动审核加群申请，支持可配置的反垃圾规则。
- `requireProfilePhoto` — 拒绝无头像用户加入。
- `autoApprove` — 自动批准通过所有规则检查的加群申请。
- 名称与简介关键词黑名单过滤。
- 验证问题，支持内联键盘和超时机制。
- i18n 国际化支持（英文和中文）。
- 拒绝通知发送至群组，用户信息脱敏显示。
- systemd 用户服务 `install` / `uninstall` / `status` 命令。
