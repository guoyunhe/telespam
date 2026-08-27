import { retry } from '@guoyunhe/retry';
import { shuffle } from 'fast-shuffle';
import { Bot, InlineKeyboard } from 'grammy';
import type { ChatJoinRequest, User } from 'grammy/types';
import i18next, { type TFunction } from 'i18next';

import enLocale from './locales/en.json';
import zhLocale from './locales/zh.json';
import { StatsManager } from './stats';

/** Supported languages. */
export type Language = 'en' | 'zh';

/** Configuration options for Telespam. */
export interface TelespamOptions {
  /** Telegram Bot API key from @BotFather */
  apiKey: string;
  /** Language for bot messages (default: 'en') */
  language?: Language;
  /** Require users to have a profile photo (default: false) */
  requireProfilePhoto?: boolean;
  /** Whether to auto-approve join requests that pass all rules (default: false) */
  autoApprove?: boolean;
  /** Blacklisted keywords in first_name, last_name, username, and bio (case-insensitive) */
  keywordBlacklist?: string[];
  /**
   * Verification question(s) sent to users after approval. Can be a single config or an array of
   * configs for multi-step verification.
   */
  verification?: VerificationConfig | VerificationConfig[];
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

/** Normalize verification config to an array. */
function normalizeVerification(
  v: VerificationConfig | VerificationConfig[] | null | undefined,
): VerificationConfig[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
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
  #t: TFunction;
  #botName: string;
  #requireProfilePhoto: boolean;
  #autoApprove: boolean;
  #keywordBlacklist: string[];
  #verification: VerificationConfig[];
  #pendingVerifications = new Map<
    string,
    {
      chatId: number;
      chatName: string;
      messageId: number;
      timer: NodeJS.Timeout;
      userName: string;
      questionIndex: number;
      correctAnswerIndex: number;
    }
  >();
  #statsManager!: StatsManager;
  #chatNames = new Map<number, string>();
  #midnightTimer: NodeJS.Timeout | null = null;

  constructor(options: TelespamOptions) {
    this.#bot = new Bot(options.apiKey);
    this.#botName = '';

    const i18n = i18next.createInstance();
    i18n.init({
      lng: options.language ?? 'en',
      fallbackLng: 'en',
      resources: {
        en: { translation: enLocale },
        zh: { translation: zhLocale },
      },
    });
    this.#t = i18n.t.bind(i18n);

    this.#requireProfilePhoto = options.requireProfilePhoto ?? false;
    this.#autoApprove = options.autoApprove ?? false;
    this.#keywordBlacklist = (options.keywordBlacklist ?? []).map((k) => k.toLowerCase());
    this.#verification = normalizeVerification(options.verification);
  }

  /**
   * Start the bot. Begins long-polling for Telegram updates and automatically reviews incoming chat
   * join requests.
   */
  async start(): Promise<void> {
    // Fetch bot username from API for log prefix
    const me = await this.#bot.api.getMe();
    this.#botName = me.username;
    this.#statsManager = new StatsManager(this.#botName);
    await this.#statsManager.init();

    this.#bot.on('chat_join_request', (ctx) => this.#handleRequest(ctx));
    this.#bot.on('callback_query:data', (ctx) => this.#handleCallback(ctx));

    this.#scheduleMidnight();

    await this.#bot.start({
      onStart: () => {
        this.#log(`Telespam started`);
      },
    });
  }

  /** Stop the bot and release resources. */
  async stop(): Promise<void> {
    if (this.#midnightTimer) {
      clearTimeout(this.#midnightTimer);
      this.#midnightTimer = null;
    }
    for (const [, pending] of this.#pendingVerifications) {
      clearTimeout(pending.timer);
    }
    this.#pendingVerifications.clear();
    await this.#bot.stop();
  }

  // ---- private helpers ----

  /** Log with [botName] prefix. */
  #log(message: string, chatName?: string, userName?: string): void {
    const parts: string[] = [];
    if (this.#botName) parts.push(`[@${this.#botName}]`);
    if (chatName) parts.push(`[${chatName}]`);
    if (userName) parts.push(`(${userName})`);
    console.log(`${parts.join(' ')} ${message}`);
  }

  /** Log error with [botName] prefix. */
  #logError(message: string, chatName?: string, userName?: string): void {
    const parts: string[] = [];
    if (this.#botName) parts.push(`[@${this.#botName}]`);
    if (chatName) parts.push(`[${chatName}]`);
    if (userName) parts.push(`(${userName})`);
    console.error(`${parts.join(' ')} ${message}`);
  }

  async #handleRequest(ctx: { chatJoinRequest: ChatJoinRequest }): Promise<void> {
    const req = ctx.chatJoinRequest;
    const { id: chatId } = req.chat;
    const { id: userId } = req.from;
    const userName = req.from.last_name
      ? req.from.first_name + ' ' + req.from.last_name
      : req.from.first_name;
    const chatName = req.chat.title || `chat ${chatId}`;
    this.#chatNames.set(chatId, chatName);

    if (this.#requireProfilePhoto && !(await this.#hasProfilePhoto(userId))) {
      await this.#decline(chatId, userId, userName, chatName, this.#t('decline.noPhoto'));
      return;
    }

    if (this.#keywordBlacklist.length > 0) {
      const matched = this.#checkNameBlacklist(req.from);
      if (matched) {
        this.#log(`Name blacklisted (keyword: ${matched})`, chatName, userName);
        await this.#decline(chatId, userId, userName, chatName, this.#t('decline.blacklist'));
        return;
      }
    }

    if (this.#keywordBlacklist.length > 0) {
      const matched = await this.#checkBioBlacklist(userId);
      if (matched) {
        this.#log(`Bio blacklisted (keyword: ${matched})`, chatName, userName);
        await this.#decline(chatId, userId, userName, chatName, this.#t('decline.blacklist'));
        return;
      }
    }

    if (this.#autoApprove) {
      await this.#bot.api.approveChatJoinRequest(chatId, userId);
      this.#log('Approved', chatName, userName);
      await this.#sendVerification(chatId, chatName, userId, userName);
    } else {
      this.#log('Skipped: auto-approve disabled', chatName, userName);
    }
  }

  async #sendVerification(
    chatId: number,
    chatName: string,
    userId: number,
    userName: string,
    questionIndex: number = 0,
  ): Promise<void> {
    if (this.#verification.length === 0) {
      this.#statsManager.record(chatId, 'approved');
      return;
    }

    const config = this.#verification[questionIndex];
    const { question, options: origOptions, timeout: timeoutSec = 180 } = config;

    // Shuffle options and track the correct answer's new position
    const indices = shuffle(origOptions.map((_, i) => i));
    const options = indices.map((i) => origOptions[i]);
    const correctAnswerIndex = indices.indexOf(config.answer);

    const keyboard = new InlineKeyboard();

    for (let i = 0; i < options.length; i++) {
      keyboard.text(options[i], `v|${userId}|${i}`).row();
    }

    const mention = `<a href="tg://user?id=${userId}">${this.#escapeHtml(userName)}</a>`;
    const text =
      `${mention}, ${this.#escapeHtml(question)}\n` +
      `\n` +
      `${this.#t('verification.timer', { seconds: timeoutSec })}\n` +
      `${this.#t('verification.kickWarning')}`;

    try {
      const msg = await this.#bot.api.sendMessage(chatId, text, {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      });
      const timer = setTimeout(
        () => this.#onVerificationTimeout(chatId, userId),
        timeoutSec * 1000,
      );
      this.#pendingVerifications.set(`${chatId}:${userId}`, {
        chatId,
        chatName,
        messageId: msg.message_id,
        timer,
        userName,
        questionIndex,
        correctAnswerIndex,
      });
    } catch {
      this.#logError(`Failed to send verification`, chatName, userName);
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
      await ctx.answerCallbackQuery(this.#t('callback.notForYou'));
      return;
    }

    const chatId = ctx.callbackQuery.message?.chat.id;
    if (!chatId) return;

    const pending = this.#pendingVerifications.get(`${chatId}:${targetUserId}`);
    if (!pending) {
      await ctx.answerCallbackQuery(this.#t('callback.expired'));
      return;
    }

    const isCorrect = pending.correctAnswerIndex === answerIndex;
    await ctx.answerCallbackQuery(
      isCorrect ? this.#t('callback.correct') : this.#t('callback.wrong'),
    );

    this.#clearVerification(chatId, targetUserId);
    await this.#bot.api.deleteMessage(pending.chatId, pending.messageId).catch(() => {});

    if (isCorrect) {
      const nextIndex = pending.questionIndex + 1;
      if (nextIndex < this.#verification.length) {
        // Advance to next question
        await this.#sendVerification(
          pending.chatId,
          pending.chatName,
          targetUserId,
          pending.userName,
          nextIndex,
        );
      } else {
        // All questions answered correctly
        this.#statsManager.record(pending.chatId, 'approved');
        this.#log('Verification passed', pending.chatName, pending.userName);
      }
    } else {
      this.#statsManager.record(pending.chatId, 'declined');
      await this.#kickUser(pending.chatId, pending.chatName, targetUserId, pending.userName);
      this.#log('Verification failed', pending.chatName, pending.userName);
    }
  }

  async #onVerificationTimeout(chatId: number, userId: number): Promise<void> {
    const pending = this.#pendingVerifications.get(`${chatId}:${userId}`);
    if (!pending) return;

    this.#clearVerification(chatId, userId);
    this.#statsManager.record(chatId, 'declined');
    await this.#bot.api.deleteMessage(chatId, pending.messageId).catch(() => {});
    await this.#kickUser(chatId, pending.chatName, userId, pending.userName);
    this.#log('Verification timeout', pending.chatName, pending.userName);
  }

  #clearVerification(chatId: number, userId: number): void {
    const key = `${chatId}:${userId}`;
    const pending = this.#pendingVerifications.get(key);
    if (pending) {
      clearTimeout(pending.timer);
      this.#pendingVerifications.delete(key);
    }
  }

  async #decline(
    chatId: number,
    userId: number,
    userName: string,
    chatName: string,
    reason: string,
  ): Promise<void> {
    await this.#bot.api.declineChatJoinRequest(chatId, userId);
    this.#statsManager.record(chatId, 'declined');
    await this.#notifyDecline(chatId, userId, userName, chatName, reason);
  }

  async #kickUser(
    chatId: number,
    chatName: string,
    userId: number,
    userName: string,
  ): Promise<void> {
    try {
      await this.#bot.api.banChatMember(chatId, userId);
      await this.#bot.api.unbanChatMember(chatId, userId).catch(() => {});
    } catch {
      this.#logError('Failed to kick', chatName, userName);
    }
  }

  #checkNameBlacklist(user: User): string | null {
    const fields = [user.first_name, user.last_name, user.username].filter(Boolean) as string[];

    for (const field of fields) {
      const lower = field.toLowerCase();
      for (const keyword of this.#keywordBlacklist) {
        if (lower.includes(keyword)) return keyword;
      }
    }

    return null;
  }

  async #checkBioBlacklist(userId: number): Promise<string | null> {
    try {
      const chat = await this.#bot.api.getChat(userId);
      if ('bio' in chat && chat.bio) {
        const lower = chat.bio.toLowerCase();
        for (const keyword of this.#keywordBlacklist) {
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
    chatName: string,
    reason: string,
  ): Promise<void> {
    const text = this.#t('decline.message', {
      name: this.#escapeHtml(this.#maskName(userName)),
      userId,
      reason,
    });

    try {
      const msg = await retry(
        () => this.#bot.api.sendMessage(chatId, text, { parse_mode: 'HTML' }),
        { retries: 3, retryDelay: 1000 },
      );
      setTimeout(() => {
        this.#bot.api.deleteMessage(chatId, msg.message_id).catch(() => {});
      }, 60_000);
    } catch {
      this.#logError(`Failed to send decline notification`, chatName);
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

  #scheduleMidnight(): void {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const ms = midnight.getTime() - now.getTime();

    this.#midnightTimer = setTimeout(() => {
      this.#sendDailyReports();
      // Switch to 24h interval
      this.#midnightTimer = setInterval(() => this.#sendDailyReports(), 24 * 60 * 60 * 1000);
    }, ms);
  }

  async #sendDailyReports(): Promise<void> {
    const snapshot = await this.#statsManager.snapshot();
    if (snapshot.size === 0) return;

    for (const [chatId, stat] of snapshot) {
      const text = [
        this.#t('report.title'),
        this.#t('report.approved', { count: stat.approved }),
        this.#t('report.declined', { count: stat.declined }),
      ].join('\n');

      try {
        await this.#bot.api.sendMessage(chatId, text);
      } catch {
        this.#logError(`Failed to send daily report`, this.#chatNames.get(chatId));
      }
    }
  }
}
