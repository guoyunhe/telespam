#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { Telespam } from './index.js';
import type { TelespamOptions } from './index.js';
import { cmdInstall, cmdStatus, cmdUninstall } from './systemd.js';

// ---- helpers ----

/** Resolve config paths, ordered by priority (first wins). */
function resolveConfigPaths(): string[] {
  return [resolve('telespam.json'), join(homedir(), '.config', 'telespam.json')];
}

/** Load the first valid config file by priority: cwd/telespam.json > ~/.config/telespam.json. */
function loadConfig(): TelespamOptions[] {
  const paths = resolveConfigPaths();

  for (const path of paths) {
    if (!existsSync(path)) continue;
    try {
      const raw = JSON.parse(readFileSync(path, 'utf-8'));
      // Support both single config and array of configs
      return Array.isArray(raw) ? raw : [raw];
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

const configs = loadConfig();

// Validate all configs
for (let i = 0; i < configs.length; i++) {
  if (!configs[i].apiKey) {
    console.error(`Missing apiKey in config[${i}] of telespam.json`);
    process.exit(1);
  }
}

const bots = configs.map((config) => new Telespam(config));

// Graceful shutdown: stop all bots on SIGINT / SIGTERM
const shutdown = async () => {
  await Promise.all(bots.map((bot) => bot.stop()));
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start all bots
await Promise.all(bots.map((bot) => bot.start()));
