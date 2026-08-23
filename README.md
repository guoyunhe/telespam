# telespam

self-host anti-spam solution for telegram

## Prerequisites

The Bot must be added as a group administrator with at least **"Invite Users"** permission to receive `chat_join_request` events and approve / decline join requests. If verification questions are enabled, **"Ban Users"** permission is also required to kick users who fail.

## Anti-Spam Rules

| Rule                      | Description                                                             |
| ------------------------- | ----------------------------------------------------------------------- |
| **Profile Photo**         | Require users to have a profile photo (optional, disabled by default)   |
| **Keyword Blacklist**     | Reject users whose name, username, or bio contains blacklisted keywords |
| **Verification Question** | After approval, send a quiz; wrong answer or timeout (180s) → kick      |

When a request is declined, a notification is sent to the group and auto-deleted after 60 seconds. User names are masked to prevent advertising.

## CLI Usage

```bash
# Install globally
npm i -g telespam

# Create config file
cp telespam.example.json telespam.json
# Edit telespam.json and fill in your bot API key

# Start the bot
telespam
```

### Configuration

Create a `telespam.json` file in the working directory:

```json
{
  "apiKey": "123456:ABC-DEF",
  "requireProfilePhoto": false,
  "autoApprove": false,
  "blacklist": ["spam", "广告"],
  "verification": null
}
```

| Option                | Type               | Default      | Description                                           |
| --------------------- | ------------------ | ------------ | ----------------------------------------------------- |
| `apiKey`              | `string`           | _(required)_ | Bot API key from [@BotFather](https://t.me/botfather) |
| `requireProfilePhoto` | `boolean`          | `false`      | Require users to have a profile photo                 |
| `autoApprove`         | `boolean`          | `false`      | Auto-approve requests that pass all rules             |
| `blacklist`           | `string[]`         | `[]`         | Blacklisted keywords (case-insensitive)               |
| `verification`        | `object` \| `null` | `null`       | Verification question sent after approval             |

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

## Programmatic Usage

```ts
import { Telespam } from 'telespam';

const bot = new Telespam({
  apiKey: '123456:ABC-DEF',
  requireProfilePhoto: true,
  autoApprove: true,
  blacklist: ['spam', '广告', '加微信'],
  verification: {
    question: 'What is 1 + 1?',
    options: ['1', '2', '3'],
    answer: 1, // 0-based index of the correct option
    timeout: 180, // seconds (default)
  },
});

await bot.start();
```

### API

#### `new Telespam(options)`

| Option                | Type                 | Default      | Description                                         |
| --------------------- | -------------------- | ------------ | --------------------------------------------------- |
| `apiKey`              | `string`             | _(required)_ | Bot API key from @BotFather                         |
| `requireProfilePhoto` | `boolean`            | `false`      | Require users to have a profile photo               |
| `autoApprove`         | `boolean`            | `false`      | Auto-approve requests that pass all rules           |
| `blacklist`           | `string[]`           | `[]`         | Blacklisted keywords in name/bio (case-insensitive) |
| `verification`        | `VerificationConfig` | `null`       | Verification question sent after approval           |

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
