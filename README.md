English | [中文](README.zh.md)

# 🤖 Telespam

[![npm version](https://badgen.net/npm/v/telespam)](https://www.npmjs.com/package/telespam)
[![npm downloads](https://badgen.net/npm/dm/telespam)](https://www.npmjs.com/package/telespam)
[![license](https://badgen.net/npm/license/telespam)](https://github.com/guoyunhe/telespam/blob/main/LICENSE)
[![node version](https://badgen.net/npm/node/telespam)](https://nodejs.org/)

Self-hosted anti-spam bot for Telegram groups — keeps your community clean with keyword filtering, profile photo checks & multi-step verification.

## Features

- 🔑 **Keyword Blacklist** — Block join requests whose name or bio contains blacklisted keywords (case-insensitive)
- 🖼️ **Profile Photo Check** — Require users to have a profile photo before joining
- ✅ **Auto-Approve** — Automatically approve requests that pass all rules
- ❓ **Verification Questions** — Challenge users with single or multi-step quizzes after approval
- 🌐 **Multi-Language** — Built-in English and Chinese (中文) bot messages
- 🔄 **Multi-Instance** — Run multiple bots from a single config file
- 🐧 **Systemd Service** — One-command install for systemd-based Linux servers

## Prerequisites

The Bot must be added as a group administrator with at least **"Invite Users"** permission to receive `chat_join_request` events and approve / decline join requests. If verification questions are enabled, **"Ban Users"** permission is also required to kick users who fail.

## Installation

```bash
sudo npm i -g telespam
```

## Configuration

Create a `~/.config/telespam.json` file in the working directory:

```json
{
  "language": "en",
  "apiKey": "123456:ABC-DEF",
  "requireProfilePhoto": false,
  "autoApprove": false,
  "keywordBlacklist": ["spam", "广告"],
  "verification": null
}
```

| Option                | Type                             | Default      | Description                                                                                          |
| --------------------- | -------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| `language`            | `"en"` \| `"zh"`                 | `"en"`       | Language for bot messages                                                                            |
| `apiKey`              | `string`                         | _(required)_ | Bot API key from [@BotFather](https://t.me/botfather)                                                |
| `requireProfilePhoto` | `boolean`                        | `false`      | Require users to have a profile photo                                                                |
| `autoApprove`         | `boolean`                        | `false`      | Auto-approve requests that pass all rules                                                            |
| `keywordBlacklist`    | `string[]`                       | `[]`         | Blacklisted keywords in names & bio (case-insensitive). Wrap with `/` for regex (e.g. `/^spam\d+$/`) |
| `verification`        | `object` \| `object[]` \| `null` | `null`       | Verification question(s) sent after approval                                                         |

#### Verification

A single verification question:

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

Multiple verification questions (multi-step):

```json
{
  "verification": [
    {
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5"],
      "answer": 1,
      "timeout": 60
    },
    {
      "question": "Which city is the capital of France?",
      "options": ["London", "Berlin", "Paris"],
      "answer": 2,
      "timeout": 60
    }
  ]
}
```

Users must answer all questions correctly in order. A wrong answer at any step results in an immediate kick.

| Field      | Type       | Default      | Description                               |
| ---------- | ---------- | ------------ | ----------------------------------------- |
| `question` | `string`   | _(required)_ | The question text                         |
| `options`  | `string[]` | _(required)_ | Answer options as inline buttons          |
| `answer`   | `number`   | _(required)_ | 0-based index of the correct option       |
| `timeout`  | `number`   | `180`        | Seconds before kicking unresponsive users |

#### Multi-instance

To run multiple bots with a single config file, use a JSON array. Each bot username is auto-detected via the Telegram API and included in log output:

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
        "question": "What is 1 + 1?",
        "options": ["1", "2", "3"],
        "answer": 1,
        "timeout": 180
      }
    ]
  }
]
```

## Config File Priority

`cwd/telespam.json` takes precedence over `~/.config/telespam.json`. The two files are not merged.

## Systemd Service

To install and start the service:

```bash
telespam install
```

To stop and uninstall the service:

```bash
telespam uninstall
```

To restart after config changes or package updates:

```bash
telespam restart
```

To view live logs:

```bash
telespam logs
```

## Programmatic Usage

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
      question: 'What is 1 + 1?',
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

| Option                | Type                                           | Default      | Description                                                                        |
| --------------------- | ---------------------------------------------- | ------------ | ---------------------------------------------------------------------------------- |
| `language`            | `'en'` \\                                      | `'zh'`       | `'en'`                                                                             | Language for bot messages |
| `apiKey`              | `string`                                       | _(required)_ | Bot API key from @BotFather                                                        |
| `requireProfilePhoto` | `boolean`                                      | `false`      | Require users to have a profile photo                                              |
| `autoApprove`         | `boolean`                                      | `false`      | Auto-approve requests that pass all rules                                          |
| `keywordBlacklist`    | `string[]`                                     | `[]`         | Blacklisted keywords in first_name / last_name / username / bio (case-insensitive) |
| `verification`        | `VerificationConfig` \| `VerificationConfig[]` | `null`       | Verification question(s) sent after approval                                       |

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
