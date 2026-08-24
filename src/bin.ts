#!/usr/bin/env node
import { createRequire } from 'node:module';

import { Command } from 'commander';

import { loadConfig } from './config.js';
import { Telespam } from './index.js';
import { cmdInstall, cmdStatus, cmdUninstall } from './systemd.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const program = new Command();

program
  .name('telespam')
  .description('self-host anti-spam solution for Telegram')
  .version(pkg.version);

program
  .command('install')
  .description('install as systemd user service')
  .action(() => {
    cmdInstall();
    process.exit(0);
  });

program
  .command('uninstall')
  .description('uninstall systemd user service')
  .action(() => {
    cmdUninstall();
    process.exit(0);
  });

program
  .command('status')
  .description('show systemd service status')
  .action(() => {
    cmdStatus();
    process.exit(0);
  });

// Default: run the bot
program.action(async () => {
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
});

program.parse();
