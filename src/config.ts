import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import type { TelespamOptions } from './index.js';

/** Resolve config paths, ordered by priority (first wins). */
export function resolveConfigPaths(): string[] {
  return [resolve('telespam.json'), join(homedir(), '.config', 'telespam.json')];
}

/** Load the first valid config file by priority: cwd/telespam.json > ~/.config/telespam.json. */
export function loadConfig(): TelespamOptions[] {
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
