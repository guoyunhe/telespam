import { Bot } from 'grammy';
import type { ChatJoinRequest } from 'grammy/types';

/** Configuration options for Telespam. */
export interface TelespamOptions {
  /** Telegram Bot API key from @BotFather */
  apiKey: string;
  /** Require users to have a profile photo (default: false) */
  requireProfilePhoto?: boolean;
  /** Whether to auto-approve join requests that pass all rules (default: false) */
  autoApprove?: boolean;
}

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
 *   ```;
 */
export class Telespam {
  #bot: Bot;
  #requireProfilePhoto: boolean;
  #autoApprove: boolean;

  constructor(options: TelespamOptions) {
    this.#bot = new Bot(options.apiKey);
    this.#requireProfilePhoto = options.requireProfilePhoto ?? false;
    this.#autoApprove = options.autoApprove ?? false;
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

    if (this.#requireProfilePhoto && !(await this.#hasProfilePhoto(userId))) {
      await this.#bot.api.declineChatJoinRequest(chatId, userId);
      console.log(`Declined user ${userId}: no profile photo`);
      return;
    }

    if (this.#autoApprove) {
      await this.#bot.api.approveChatJoinRequest(chatId, userId);
      console.log(`Approved user ${userId} in chat ${chatId}`);
    } else {
      console.log(`Skipped user ${userId} in chat ${chatId}: auto-approve disabled`);
    }
  }

  async #hasProfilePhoto(userId: number): Promise<boolean> {
    try {
      const { total_count } = await this.#bot.api.getUserProfilePhotos(userId);
      return total_count > 0;
    } catch {
      return false;
    }
  }
}
