import { Bot } from 'grammy';
import type { ChatJoinRequest } from 'grammy/types';

/** Configuration options for Telespam. */
export interface TelespamOptions {
  /** Telegram Bot API key from @BotFather */
  apiKey: string;
  /** Minimum account age in days (default: 30) */
  minAccountAgeDays?: number;
}

/**
 * Approximate Unix timestamp when Telegram user IDs started. Telegram user IDs encode creation time
 * as: (id >> 32) + TELEGRAM_EPOCH
 */
const TELEGRAM_EPOCH = 1_388_534_400; // 2014-01-01T00:00:00Z

/**
 * Telespam — self-hosted anti-spam bot for Telegram groups.
 *
 * Automatically reviews chat join requests and approves / declines them based on configurable
 * anti-spam rules.
 *
 * @example
 *   ```ts
 *   const bot = new Telespam({ apiKey: '123456:ABC-DEF1234' });
 *   await bot.start();
 *   ```
 */
export class Telespam {
  #bot: Bot;
  #minAccountAgeMs: number;

  constructor(options: TelespamOptions) {
    this.#bot = new Bot(options.apiKey);
    this.#minAccountAgeMs = (options.minAccountAgeDays ?? 30) * 24 * 60 * 60 * 1000;
  }

  /**
   * Start the bot. Begins long-polling for Telegram updates and automatically reviews incoming chat
   * join requests.
   */
  async start(): Promise<void> {
    this.#bot.on('chat_join_request', (ctx) => this.#handleRequest(ctx.chatJoinRequest));

    await this.#bot.start({
      onStart: (info) => {
        console.log(`Telespam started: @${info.username}`);
      },
    });
  }

  /** Stop the bot and release resources. */
  async stop(): Promise<void> {
    await this.#bot.stop();
  }

  // ---- private helpers ----

  async #handleRequest(req: ChatJoinRequest): Promise<void> {
    const { id: chatId } = req.chat;
    const { id: userId } = req.from;

    // Rule 1: must have a profile photo
    if (!(await this.#hasProfilePhoto(userId))) {
      await this.#bot.api.declineChatJoinRequest(chatId, userId);
      console.log(`Declined user ${userId}: no profile photo`);
      return;
    }

    // Rule 2: account must be older than minAccountAgeDays
    if (!this.#isAccountOldEnough(userId)) {
      await this.#bot.api.declineChatJoinRequest(chatId, userId);
      console.log(`Declined user ${userId}: account too new`);
      return;
    }

    await this.#bot.api.approveChatJoinRequest(chatId, userId);
    console.log(`Approved user ${userId} in chat ${chatId}`);
  }

  async #hasProfilePhoto(userId: number): Promise<boolean> {
    try {
      const { total_count } = await this.#bot.api.getUserProfilePhotos(userId);
      return total_count > 0;
    } catch {
      return false;
    }
  }

  #isAccountOldEnough(userId: number): boolean {
    const estimatedCreatedAt = ((userId >> 32) + TELEGRAM_EPOCH) * 1000;
    return Date.now() - estimatedCreatedAt >= this.#minAccountAgeMs;
  }
}
