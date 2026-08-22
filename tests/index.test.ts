import { expect, test } from 'vitest';

import { Telespam } from '../src';

test('Telespam constructor accepts apiKey', () => {
  const bot = new Telespam({ apiKey: '123456:ABC-DEF' });
  expect(bot).toBeInstanceOf(Telespam);
});

test('Telespam constructor accepts minAccountAgeDays', () => {
  const bot = new Telespam({ apiKey: '123456:ABC-DEF', minAccountAgeDays: 60 });
  expect(bot).toBeInstanceOf(Telespam);
});

test('Telespam has start and stop methods', () => {
  const bot = new Telespam({ apiKey: '123456:ABC-DEF' });
  expect(typeof bot.start).toBe('function');
  expect(typeof bot.stop).toBe('function');
});
