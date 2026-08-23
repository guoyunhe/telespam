#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { Telespam } from './index.js';
import type { TelespamOptions } from './index.js';
import { cmdInstall, cmdStatus, cmdUninstall } from './systemd.js';

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

// ---- helpers ----

/** Resolve config paths, ordered by priority (first wins). */
function resolveConfigPaths(): string[] {
  return [resolve('telespam.json'), join(homedir(), '.config', 'telespam.json')];
}

/** Load the first valid config file by priority: cwd/telespam.json > ~/.config/telespam.json. */
function loadConfig(): Config {
  const paths = resolveConfigPaths();

  for (const path of paths) {
    if (!existsSync(path)) continue;
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
      console.error(`Warning: invalid JSON in ${path}`);
    }
  }

  console.error('No valid telespam.json found');
  console.error(`  Expected at: ${paths.join(' or ')}`);
  process.exit(1);
}

// ---- main ----

const command = process.argv[2];

switch (command) {
  case 'install':
    cmdInstall();
    process.exit(0);
  case 'uninstall':
    cmdUninstall();
    process.exit(0);
  case 'status':
    cmdStatus();
    process.exit(0);
  case undefined:
    // Run the bot
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error('Usage: telespam [install|uninstall|status]');
    process.exit(1);
}

// ---- run bot ----

const config = loadConfig();

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
