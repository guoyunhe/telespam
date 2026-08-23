# telespam

self-host anti-spam solution for telegram

## Prerequisites

The Bot must be added as a group administrator with at least **"Invite Users"** permission to receive `chat_join_request` events and approve / decline join requests.

## Anti-Spam Rules

| Rule                  | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| **Profile Photo**     | Require users to have a profile photo (optional, disabled by default)   |
| **Keyword Blacklist** | Reject users whose name, username, or bio contains blacklisted keywords |

When a request is declined, a notification is sent to the group and auto-deleted after 60 seconds. User names are masked to prevent advertising.

## CLI Usage

```bash
# Install globally
npm i -g telespam

# Create .env config
cp .env.example .env
# Edit .env and fill in your bot API key

# Start the bot
telespam
```

### Environment Variables

| Variable                | Default      | Description                                             |
| ----------------------- | ------------ | ------------------------------------------------------- |
| `TELEGRAM_BOT_API_KEY`  | _(required)_ | Bot API key from [@BotFather](https://t.me/botfather)   |
| `REQUIRE_PROFILE_PHOTO` | `false`      | Require users to have a profile photo                   |
| `AUTO_APPROVE`          | `false`      | Auto-approve requests that pass all rules               |
| `BLACKLIST`             | _(empty)_    | Comma-separated blacklisted keywords (case-insensitive) |

## Programmatic Usage

```ts
import { Telespam } from 'telespam';

const bot = new Telespam({
  apiKey: '123456:ABC-DEF',
  requireProfilePhoto: true,
  autoApprove: true,
  blacklist: ['spam', '广告', '加微信'],
});

await bot.start();
```

### API

#### `new Telespam(options)`

| Option                | Type       | Default      | Description                                         |
| --------------------- | ---------- | ------------ | --------------------------------------------------- |
| `apiKey`              | `string`   | _(required)_ | Bot API key from @BotFather                         |
| `requireProfilePhoto` | `boolean`  | `false`      | Require users to have a profile photo               |
| `autoApprove`         | `boolean`  | `false`      | Auto-approve requests that pass all rules           |
| `blacklist`           | `string[]` | `[]`         | Blacklisted keywords in name/bio (case-insensitive) |

#### `bot.start()`

Starts long-polling for Telegram updates and reviews incoming join requests.

#### `bot.stop()`

Stops the bot and releases resources.
