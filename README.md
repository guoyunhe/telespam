# telespam

self-host anti-spam solution for telegram

## Prerequisites

The Bot must be added as a group administrator with at least **"Invite Users"** permission to receive `chat_join_request` events and approve / decline join requests.

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

| Variable                | Default      | Description                                           |
| ----------------------- | ------------ | ----------------------------------------------------- |
| `TELEGRAM_BOT_API_KEY`  | _(required)_ | Bot API key from [@BotFather](https://t.me/botfather) |
| `REQUIRE_PROFILE_PHOTO` | `false`      | Require users to have a profile photo                 |
| `AUTO_APPROVE`          | `false`      | Auto-approve requests that pass all rules             |
