#!/usr/bin/env node
import { loadConfig } from './config.js';
import { Telespam } from './index.js';
import { cmdInstall, cmdStatus, cmdUninstall } from './systemd.js';

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
