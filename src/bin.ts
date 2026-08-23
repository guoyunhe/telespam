#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Telespam } from './index.js';
import type { TelespamOptions } from './index.js';

interface Config {
  apiKey?: string;
  requireProfilePhoto?: boolean;
  autoApprove?: boolean;
  blacklist?: string[];
  verification?: {
    question: string;
    options: string[];
    answer: number;
    timeout?: number;
  };
}

let config: Config = {};

try {
  const path = resolve('telespam.json');
  config = JSON.parse(readFileSync(path, 'utf-8'));
} catch {
  console.error('Missing or invalid telespam.json in current directory');
  process.exit(1);
}

if (!config.apiKey) {
  console.error('Missing apiKey in telespam.json');
  process.exit(1);
}

const bot = new Telespam(config as TelespamOptions);

process.on('SIGINT', () => {
  bot.stop().then(() => process.exit(0));
});
process.on('SIGTERM', () => {
  bot.stop().then(() => process.exit(0));
});

await bot.start();
