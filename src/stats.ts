import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

/** Per-chat approval/decline counters persisted across restarts. */
export class StatsManager {
  #stats = new Map<number, { approved: number; declined: number }>();
  #statsFile: string;

  constructor(botName: string) {
    this.#statsFile = `${tmpdir()}/telespam-stats-${botName}.json`;
    this.#restore();
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
  snapshot(): Map<number, { approved: number; declined: number }> {
    const snap = new Map(this.#stats);
    this.#stats.clear();
    try {
      unlinkSync(this.#statsFile);
    } catch {
      /* ignore */
    }
    return snap;
  }

  // ---- private ----

  #persist(): void {
    try {
      writeFileSync(this.#statsFile, JSON.stringify([...this.#stats]), 'utf-8');
    } catch {
      // best-effort: ignore write failures
    }
  }

  #restore(): void {
    try {
      if (existsSync(this.#statsFile)) {
        const raw = readFileSync(this.#statsFile, 'utf-8');
        const entries: [number, { approved: number; declined: number }][] = JSON.parse(raw);
        this.#stats = new Map(entries);
      }
    } catch {
      // best-effort: ignore corrupted/missing file
    }
  }
}
