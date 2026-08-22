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

const minAccountAgeDays = process.env.MIN_ACCOUNT_AGE_DAYS
  ? Number(process.env.MIN_ACCOUNT_AGE_DAYS)
  : undefined;

const bot = new Telespam({ apiKey, minAccountAgeDays });

process.on('SIGINT', () => {
  bot.stop().then(() => process.exit(0));
});
process.on('SIGTERM', () => {
  bot.stop().then(() => process.exit(0));
});

await bot.start();
