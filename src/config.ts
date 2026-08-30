import { existsSync, globSync, readFileSync } from 'node:fs';

import type { TelespamOptions } from './index.js';

/** Load all valid config files from /etc/telespam/*.json. */
export function loadConfig(): TelespamOptions[] {
  const paths = globSync('/etc/telespam/*.json');

  const configs: TelespamOptions[] = [];

  for (const path of paths) {
    if (!existsSync(path)) continue;
    try {
      const raw = JSON.parse(readFileSync(path, 'utf-8'));
      // Support both single config and array of configs
      const parsed = Array.isArray(raw) ? raw : [raw];
      configs.push(...parsed);
    } catch {
      console.error(`Warning: invalid JSON in ${path}`);
    }
  }

  if (configs.length > 0) {
    return configs;
  }

  console.error('No valid telespam.json found');
  process.exit(1);
}
