[English](README.md) | [中文](README.zh.md)

# telespam

自托管 Telegram 反垃圾广告方案

## 前置条件

Bot 必须被添加为群组管理员，至少拥有 **"邀请用户"** 权限才能接收 `chat_join_request` 事件并批准/拒绝加群申请。如果启用了验证问题，还需要 **"封禁用户"** 权限来踢出验证失败的用户。

## 安装

```bash
sudo npm i -g telespam
```

## 配置

创建 `~/.config/telespam.json` 配置文件：

```json
{
  "language": "zh",
  "apiKey": "123456:ABC-DEF",
  "requireProfilePhoto": false,
  "autoApprove": false,
  "keywordBlacklist": ["spam", "广告"],
  "verification": null
}
```

| 选项                  | 类型                             | 默认值   | 说明                                                        |
| --------------------- | -------------------------------- | -------- | ----------------------------------------------------------- |
| `language`            | `"en"` \| `"zh"`                 | `"en"`   | Bot 消息语言                                                |
| `apiKey`              | `string`                         | _(必填)_ | 从 [@BotFather](https://t.me/botfather) 获取的 Bot API 密钥 |
| `requireProfilePhoto` | `boolean`                        | `false`  | 要求用户必须设置头像                                        |
| `autoApprove`         | `boolean`                        | `false`  | 自动批准通过所有规则的加群申请                              |
| `keywordBlacklist`    | `string[]`                       | `[]`     | 名称与简介黑名单关键词（不区分大小写）                      |
| `verification`        | `object` \| `object[]` \| `null` | `null`   | 批准后发送的验证问题                                        |

#### 验证问题

单个验证问题：

```json
{
  "verification": {
    "question": "1 + 1 等于几？",
    "options": ["1", "2", "3"],
    "answer": 1,
    "timeout": 180
  }
}
```

多个验证问题（多步验证）：

```json
{
  "verification": [
    {
      "question": "2 + 2 等于几？",
      "options": ["3", "4", "5"],
      "answer": 1,
      "timeout": 60
    },
    {
      "question": "法国的首都是哪个城市？",
      "options": ["伦敦", "柏林", "巴黎"],
      "answer": 2,
      "timeout": 60
    }
  ]
}
```

用户必须按顺序正确回答所有问题。任何一步回答错误都会被立即踢出。

| 字段       | 类型       | 默认值   | 说明                        |
| ---------- | ---------- | -------- | --------------------------- |
| `question` | `string`   | _(必填)_ | 问题文本                    |
| `options`  | `string[]` | _(必填)_ | 内联按钮选项                |
| `answer`   | `number`   | _(必填)_ | 正确选项的索引（从 0 开始） |
| `timeout`  | `number`   | `180`    | 超时踢出用户的秒数          |

#### 多实例

要使用单个配置文件运行多个 bot，可以使用 JSON 数组。每个 bot 的用户名会通过 Telegram API 自动获取并显示在日志中：

```json
[
  {
    "language": "en",
    "apiKey": "123456:ABC-DEF",
    "requireProfilePhoto": true,
    "autoApprove": true,
    "keywordBlacklist": ["spam"],
    "verification": null
  },
  {
    "language": "zh",
    "apiKey": "654321:GHI-JKL",
    "requireProfilePhoto": false,
    "autoApprove": false,
    "keywordBlacklist": ["广告"],
    "verification": [
      {
        "question": "1 + 1 等于几？",
        "options": ["1", "2", "3"],
        "answer": 1,
        "timeout": 180
      }
    ]
  }
]
```

## 配置文件优先级

`cwd/telespam.json` 优先于 `~/.config/telespam.json`，不会合并两个文件。

## Systemd 服务

安装并启动服务：

```bash
telespam install
```

停止并卸载服务：

```bash
telespam uninstall
```

修改配置或更新包后重启服务：

```bash
systemctl --user restart telespam
```

## 编程使用

```ts
import { Telespam } from 'telespam';

const bot = new Telespam({
  language: 'zh',
  apiKey: '123456:ABC-DEF',
  requireProfilePhoto: true,
  autoApprove: true,
  keywordBlacklist: ['spam', '广告'],
  verification: [
    {
      question: '1 + 1 等于几？',
      options: ['1', '2', '3'],
      answer: 1,
      timeout: 180,
    },
  ],
});

await bot.start();
```

### API

#### `new Telespam(options)`

| 选项                  | 类型                                           | 默认值   | 说明                                                                                 |
| --------------------- | ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `language`            | `'en'` \| `'zh'`                               | `'en'`   | Bot 消息语言                                                                         |
| `apiKey`              | `string`                                       | _(必填)_ | 从 @BotFather 获取的 Bot API 密钥                                                    |
| `requireProfilePhoto` | `boolean`                                      | `false`  | 要求用户必须设置头像                                                                 |
| `autoApprove`         | `boolean`                                      | `false`  | 自动批准通过所有规则的加群申请                                                       |
| `keywordBlacklist`    | `string[]`                                     | `[]`     | 名称与简介黑名单关键词，匹配 first_name / last_name / username / bio（不区分大小写） |
| `verification`        | `VerificationConfig` \| `VerificationConfig[]` | `null`   | 批准后发送的验证问题                                                                 |

#### `VerificationConfig`

| 字段       | 类型       | 默认值   | 说明                        |
| ---------- | ---------- | -------- | --------------------------- |
| `question` | `string`   | _(必填)_ | 问题文本                    |
| `options`  | `string[]` | _(必填)_ | 内联按钮选项                |
| `answer`   | `number`   | _(必填)_ | 正确选项的索引（从 0 开始） |
| `timeout`  | `number`   | `180`    | 超时踢出用户的秒数          |

#### `bot.start()`

启动长轮询，接收 Telegram 更新并审核加群申请。

#### `bot.stop()`

停止 Bot 并释放资源。
