#!/usr/bin/env node
import { Telespam } from './index.js';

// Load .env from CWD (Node.js built-in, v20.12+)
try {
  process.loadEnvFile();
} catch {
  // .env is optional — user may provide env vars directly
}

const apiKey = process.env.TELEGRAM_BOT_API_KEY;
if (!apiKey) {
  console.error('Missing TELEGRAM_BOT_API_KEY environment variable');
  process.exit(1);
}

const requireProfilePhoto = process.env.REQUIRE_PROFILE_PHOTO
  ? process.env.REQUIRE_PROFILE_PHOTO !== 'false'
  : undefined;

const autoApprove = process.env.AUTO_APPROVE ? process.env.AUTO_APPROVE !== 'false' : undefined;

const bot = new Telespam({ apiKey, requireProfilePhoto, autoApprove });

process.on('SIGINT', () => {
  bot.stop().then(() => process.exit(0));
});
process.on('SIGTERM', () => {
  bot.stop().then(() => process.exit(0));
});

await bot.start();
