import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Per-chat approval/decline counters persisted across restarts. */
export class StatsManager {
  #stats = new Map<number, { approved: number; declined: number }>();
  #statsFile: string;

  constructor(botName: string) {
    this.#statsFile = join(tmpdir(), `telespam-stats-${botName}.json`);
  }

  /** Restore persisted stats from the previous run. Call once before using the manager. */
  async init(): Promise<void> {
    await this.#restore();
  }

  /** Record an approval or decline for a chat. */
  record(chatId: number, type: 'approved' | 'declined'): void {
    let entry = this.#stats.get(chatId);
    if (!entry) {
      entry = { approved: 0, declined: 0 };
      this.#stats.set(chatId, entry);
    }
    entry[type]++;
    this.#persist();
  }

  /**
   * Take a snapshot of current stats, then clear in-memory state and the backing file. Returns the
   * snapshot (may be empty).
   */
  async snapshot(): Promise<Map<number, { approved: number; declined: number }>> {
    const snap = new Map(this.#stats);
    this.#stats.clear();
    try {
      await unlink(this.#statsFile);
    } catch {
      /* ignore */
    }
    return snap;
  }

  // ---- private ----

  async #persist(): Promise<void> {
    try {
      await writeFile(this.#statsFile, JSON.stringify([...this.#stats]), 'utf-8');
    } catch {
      // best-effort: ignore write failures
    }
  }

  async #restore(): Promise<void> {
    try {
      const raw = await readFile(this.#statsFile, 'utf-8');
      const entries: [number, { approved: number; declined: number }][] = JSON.parse(raw);
      this.#stats = new Map(entries);
    } catch {
      // best-effort: ignore corrupted/missing file
    }
  }
}
