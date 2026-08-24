[English](README.md) | [中文](README.zh.md)

# telespam

self-host anti-spam solution for telegram

## Prerequisites

The Bot must be added as a group administrator with at least **"Invite Users"** permission to receive `chat_join_request` events and approve / decline join requests. If verification questions are enabled, **"Ban Users"** permission is also required to kick users who fail.

## Installation

```bash
sudo npm i -g telespam
```

### Configuration

Create a `~/.config/telespam.json` file in the working directory:

```json
{
  "language": "en",
  "apiKey": "123456:ABC-DEF",
  "requireProfilePhoto": false,
  "autoApprove": false,
  "nameKeywordBlacklist": [],
  "bioKeywordBlacklist": ["spam", "广告"],
  "verification": null
}
```

| Option                 | Type               | Default      | Description                                           |
| ---------------------- | ------------------ | ------------ | ----------------------------------------------------- |
| `language`             | `"en"` \| `"zh"`   | `"en"`       | Language for bot messages                             |
| `apiKey`               | `string`           | _(required)_ | Bot API key from [@BotFather](https://t.me/botfather) |
| `requireProfilePhoto`  | `boolean`          | `false`      | Require users to have a profile photo                 |
| `autoApprove`          | `boolean`          | `false`      | Auto-approve requests that pass all rules             |
| `nameKeywordBlacklist` | `string[]`         | `[]`         | Blacklisted keywords in names (case-insensitive)      |
| `bioKeywordBlacklist`  | `string[]`         | `[]`         | Blacklisted keywords in bio (case-insensitive)        |
| `verification`         | `object` \| `null` | `null`       | Verification question sent after approval             |

#### Verification

```json
{
  "verification": {
    "question": "What is 1 + 1?",
    "options": ["1", "2", "3"],
    "answer": 1,
    "timeout": 180
  }
}
```

| Field      | Type       | Default      | Description                               |
| ---------- | ---------- | ------------ | ----------------------------------------- |
| `question` | `string`   | _(required)_ | The question text                         |
| `options`  | `string[]` | _(required)_ | Answer options as inline buttons          |
| `answer`   | `number`   | _(required)_ | 0-based index of the correct option       |
| `timeout`  | `number`   | `180`        | Seconds before kicking unresponsive users |

## Systemd Service

To install and start the service:

```bash
telespam install
```

To stop and uninstall the service:

```bash
telespam uninstall
```

## Programmatic Usage

```ts
import { Telespam } from 'telespam';

const bot = new Telespam({
  language: 'zh',
  apiKey: '123456:ABC-DEF',
  requireProfilePhoto: true,
  autoApprove: true,
  nameKeywordBlacklist: ['spam', '广告'],
  bioKeywordBlacklist: ['加微信'],
  verification: {
    question: 'What is 1 + 1?',
    options: ['1', '2', '3'],
    answer: 1,
    timeout: 180,
  },
});

await bot.start();
```

### API

#### `new Telespam(options)`

| Option                 | Type                 | Default      | Description                                                                  |
| ---------------------- | -------------------- | ------------ | ---------------------------------------------------------------------------- |
| `language`             | `'en'` \\            | `'zh'`       | `'en'`                                                                       | Language for bot messages |
| `apiKey`               | `string`             | _(required)_ | Bot API key from @BotFather                                                  |
| `requireProfilePhoto`  | `boolean`            | `false`      | Require users to have a profile photo                                        |
| `autoApprove`          | `boolean`            | `false`      | Auto-approve requests that pass all rules                                    |
| `nameKeywordBlacklist` | `string[]`           | `[]`         | Blacklisted keywords in first_name / last_name / username (case-insensitive) |
| `bioKeywordBlacklist`  | `string[]`           | `[]`         | Blacklisted keywords in bio (case-insensitive)                               |
| `verification`         | `VerificationConfig` | `null`       | Verification question sent after approval                                    |

#### `VerificationConfig`

| Field      | Type       | Default      | Description                               |
| ---------- | ---------- | ------------ | ----------------------------------------- |
| `question` | `string`   | _(required)_ | The question text                         |
| `options`  | `string[]` | _(required)_ | Answer options as inline buttons          |
| `answer`   | `number`   | _(required)_ | 0-based index of the correct option       |
| `timeout`  | `number`   | `180`        | Seconds before kicking unresponsive users |

#### `bot.start()`

Starts long-polling for Telegram updates and reviews incoming join requests.

#### `bot.stop()`

Stops the bot and releases resources.
