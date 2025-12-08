import { Telegraf, Context } from "telegraf";
import { config } from "./config/env";
import { startHandler } from "./handlers/start";
import { helpHandler } from "./handlers/help";
import { aboutHandler } from "./handlers/about";
import {
  feedbackHandler,
  setupFeedbackListener,
  setupAdminReply,
} from "./handlers/feedback";
import { botLogger, logError, logTelegramUpdate } from "./lib/logger";

export const bot = new Telegraf(config.botToken);

// Middleware для логирования всех обновлений
bot.use(async (ctx: Context, next) => {
  const startTime = Date.now();
  const updateType = ctx.updateType;
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const chatId = ctx.chat?.id;

  logTelegramUpdate(updateType, userId, username, chatId);

  try {
    await next();
    const duration = Date.now() - startTime;
    botLogger.debug(`Update processed in ${duration}ms`, {
      updateType,
      userId,
      duration,
    });
  } catch (error) {
    logError(error, {
      updateType,
      userId,
      username,
      chatId,
    });
    throw error;
  }
});

// Регистрируем команды
bot.start(startHandler);
bot.help(helpHandler);
bot.command("about", aboutHandler);
bot.command("feedback", feedbackHandler);

// Настраиваем систему обратной связи
setupFeedbackListener(bot);
setupAdminReply(bot);

// Обработка неизвестных команд
bot.on("text", async (ctx) => {
  // Если сообщение начинается с /, но команда не распознана
  if (ctx.message.text.startsWith("/")) {
    botLogger.debug("Unknown command received", {
      command: ctx.message.text,
      userId: ctx.from.id,
    });
    await ctx.reply(
      "🤔 Неизвестная команда. Используй /help для списка команд."
    );
  }
});

// Обработка ошибок бота
bot.catch((err: unknown, ctx: Context) => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  const errorStack = err instanceof Error ? err.stack : undefined;

  botLogger.error(`Bot error for ${ctx.updateType}`, {
    error: errorMessage,
    stack: errorStack,
    updateType: ctx.updateType,
    userId: ctx.from?.id,
    chatId: ctx.chat?.id,
  });

  // Пытаемся уведомить пользователя об ошибке
  ctx
    .reply("😔 Произошла ошибка. Попробуйте позже.")
    .catch((replyError) => {
      botLogger.error("Failed to send error message to user", {
        error: replyError instanceof Error ? replyError.message : String(replyError),
      });
    });
});

botLogger.info("Bot initialized");
