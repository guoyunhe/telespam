import { Bot, InlineKeyboard } from 'grammy';
import type { ChatJoinRequest, User } from 'grammy/types';

/** Configuration options for Telespam. */
export interface TelespamOptions {
  /** Telegram Bot API key from @BotFather */
  apiKey: string;
  /** Require users to have a profile photo (default: false) */
  requireProfilePhoto?: boolean;
  /** Whether to auto-approve join requests that pass all rules (default: false) */
  autoApprove?: boolean;
  /** Blacklisted keywords in name or bio (case-insensitive) */
  blacklist?: string[];
  /** Verification question sent to users after approval */
  verification?: VerificationConfig;
}

/** Configuration for a verification question. */
export interface VerificationConfig {
  /** The question text */
  question: string;
  /** Answer options displayed as inline buttons */
  options: string[];
  /** Index of the correct answer (0-based) */
  answer: number;
  /** Timeout in seconds before kicking the user (default: 180) */
  timeout?: number;
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
  #blacklist: string[];
  #verification: VerificationConfig | null;
  #pendingVerifications = new Map<
    number,
    { chatId: number; messageId: number; timer: NodeJS.Timeout }
  >();

  constructor(options: TelespamOptions) {
    this.#bot = new Bot(options.apiKey);
    this.#requireProfilePhoto = options.requireProfilePhoto ?? false;
    this.#autoApprove = options.autoApprove ?? false;
    this.#blacklist = (options.blacklist ?? []).map((k) => k.toLowerCase());
    this.#verification = options.verification ?? null;
  }

  /**
   * Start the bot. Begins long-polling for Telegram updates and automatically reviews incoming chat
   * join requests.
   */
  async start(): Promise<void> {
    this.#bot.on('chat_join_request', (ctx) => this.#handleRequest(ctx.chatJoinRequest));
    this.#bot.on('callback_query:data', (ctx) => this.#handleCallback(ctx));

    await this.#bot.start({
      onStart: (info) => {
        console.log(`Telespam started: @${info.username}`);
      },
    });
  }

  /** Stop the bot and release resources. */
  async stop(): Promise<void> {
    for (const [, pending] of this.#pendingVerifications) {
      clearTimeout(pending.timer);
    }
    this.#pendingVerifications.clear();
    await this.#bot.stop();
  }

  // ---- private helpers ----

  async #handleRequest(req: ChatJoinRequest): Promise<void> {
    const { id: chatId } = req.chat;
    const { id: userId } = req.from;
    const userName = req.from.first_name || `user ${userId}`;

    if (this.#requireProfilePhoto && !(await this.#hasProfilePhoto(userId))) {
      await this.#bot.api.declineChatJoinRequest(chatId, userId);
      await this.#notifyDecline(chatId, userId, userName, 'no profile photo');
      return;
    }

    if (this.#blacklist.length > 0) {
      const matched = await this.#checkBlacklist(req.from);
      if (matched) {
        await this.#bot.api.declineChatJoinRequest(chatId, userId);
        await this.#notifyDecline(chatId, userId, userName, `blacklisted keyword: ${matched}`);
        return;
      }
    }

    if (this.#autoApprove) {
      await this.#bot.api.approveChatJoinRequest(chatId, userId);
      console.log(`Approved user ${userId} in chat ${chatId}`);
      await this.#sendVerification(chatId, userId, userName);
    } else {
      console.log(`Skipped user ${userId} in chat ${chatId}: auto-approve disabled`);
    }
  }

  async #sendVerification(chatId: number, userId: number, userName: string): Promise<void> {
    if (!this.#verification) return;

    const { question, options, timeout: timeoutSec = 180 } = this.#verification;
    const keyboard = new InlineKeyboard();

    for (let i = 0; i < options.length; i++) {
      keyboard.text(options[i], `v|${userId}|${i}`).row();
    }

    const mention = `<a href="tg://user?id=${userId}">${this.#escapeHtml(userName)}</a>`;
    const text =
      `${mention}, ${this.#escapeHtml(question)}\n` +
      `\n` +
      `⏳ You have ${timeoutSec} seconds to answer.\n` +
      `❌ Wrong answer or timeout → kicked from the group.`;

    try {
      const msg = await this.#bot.api.sendMessage(chatId, text, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
      const timer = setTimeout(
        () => this.#onVerificationTimeout(chatId, userId),
        timeoutSec * 1000,
      );
      this.#pendingVerifications.set(userId, { chatId, messageId: msg.message_id, timer });
    } catch {
      console.error(`Failed to send verification to chat ${chatId}`);
    }
  }

  async #handleCallback(ctx: {
    callbackQuery: {
      data: string;
      from: { id: number };
      message?: { message_id: number; chat: { id: number } };
    };
    answerCallbackQuery: (text?: string) => Promise<true>;
  }): Promise<void> {
    const { data } = ctx.callbackQuery;
    const parts = data.split('|');
    if (parts.length !== 3 || parts[0] !== 'v') return;

    const targetUserId = Number(parts[1]);
    const answerIndex = Number(parts[2]);
    const fromId = ctx.callbackQuery.from.id;

    if (fromId !== targetUserId) {
      await ctx.answerCallbackQuery('This is not for you');
      return;
    }

    const pending = this.#pendingVerifications.get(targetUserId);
    if (!pending) {
      await ctx.answerCallbackQuery('Verification expired');
      return;
    }

    const isCorrect = this.#verification?.answer === answerIndex;
    await ctx.answerCallbackQuery(isCorrect ? '✅ Correct!' : '❌ Wrong answer');

    this.#clearVerification(targetUserId);
    await this.#bot.api.deleteMessage(pending.chatId, pending.messageId).catch(() => {});

    if (isCorrect) {
      console.log(`User ${targetUserId} passed verification`);
    } else {
      await this.#kickUser(pending.chatId, targetUserId);
      console.log(`User ${targetUserId} kicked: wrong verification answer`);
    }
  }

  async #onVerificationTimeout(chatId: number, userId: number): Promise<void> {
    const pending = this.#pendingVerifications.get(userId);
    if (!pending) return;

    this.#clearVerification(userId);
    await this.#bot.api.deleteMessage(chatId, pending.messageId).catch(() => {});
    await this.#kickUser(chatId, userId);
    console.log(`User ${userId} kicked: verification timeout`);
  }

  #clearVerification(userId: number): void {
    const pending = this.#pendingVerifications.get(userId);
    if (pending) {
      clearTimeout(pending.timer);
      this.#pendingVerifications.delete(userId);
    }
  }

  async #kickUser(chatId: number, userId: number): Promise<void> {
    try {
      await this.#bot.api.banChatMember(chatId, userId);
      await this.#bot.api.unbanChatMember(chatId, userId).catch(() => {});
    } catch {
      console.error(`Failed to kick user ${userId} from chat ${chatId}`);
    }
  }

  async #checkBlacklist(user: User): Promise<string | null> {
    const fields = [user.first_name, user.last_name, user.username].filter(Boolean) as string[];

    for (const field of fields) {
      const lower = field.toLowerCase();
      for (const keyword of this.#blacklist) {
        if (lower.includes(keyword)) return keyword;
      }
    }

    try {
      const chat = await this.#bot.api.getChat(user.id);
      if ('bio' in chat && chat.bio) {
        const lower = chat.bio.toLowerCase();
        for (const keyword of this.#blacklist) {
          if (lower.includes(keyword)) return keyword;
        }
      }
    } catch {
      // ignore — bio check is best-effort
    }

    return null;
  }

  async #hasProfilePhoto(userId: number): Promise<boolean> {
    try {
      const { total_count } = await this.#bot.api.getUserProfilePhotos(userId);
      return total_count > 0;
    } catch {
      return false;
    }
  }

  async #notifyDecline(
    chatId: number,
    userId: number,
    userName: string,
    reason: string,
  ): Promise<void> {
    const maskedName = this.#maskName(userName);
    const text =
      `🚫 Join request declined\n\n` +
      `<a href="tg://user?id=${userId}">${this.#escapeHtml(maskedName)}</a>` +
      ` (ID: <code>${userId}</code>)\n` +
      `Reason: ${reason}`;

    try {
      const msg = await this.#bot.api.sendMessage(chatId, text, { parse_mode: 'HTML' });
      setTimeout(() => {
        this.#bot.api.deleteMessage(chatId, msg.message_id).catch(() => {});
      }, 60_000);
    } catch {
      console.error(`Failed to send decline notification to chat ${chatId}`);
    }
  }

  #escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  #maskName(name: string): string {
    if (name.length <= 1) return name;
    if (name.length === 2) return name[0] + '*';
    return name[0] + '*'.repeat(Math.min(name.length - 2, 3)) + name[name.length - 1];
  }
}
