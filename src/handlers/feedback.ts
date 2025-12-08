import { Context, Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { config } from "../config/env";

// Храним состояние пользователей, ожидающих ввода сообщения
const awaitingFeedback = new Set<number>();

const FEEDBACK_PROMPT = `
📝 <b>Обратная связь</b>

Напиши своё сообщение, вопрос или предложение — я передам его разработчику.

<i>Отправь текст следующим сообщением:</i>
`.trim();

const FEEDBACK_RECEIVED = `
✅ <b>Спасибо за обратную связь!</b>

Твоё сообщение отправлено разработчику. Если нужен ответ — он свяжется с тобой.
`.trim();

const NO_ADMIN = `
⚠️ К сожалению, функция обратной связи временно недоступна.
`.trim();

export const feedbackHandler = async (ctx: Context) => {
  if (!ctx.from) return;

  if (config.adminIds.length === 0) {
    await ctx.reply(NO_ADMIN, { parse_mode: "HTML" });
    return;
  }

  awaitingFeedback.add(ctx.from.id);
  await ctx.reply(FEEDBACK_PROMPT, { parse_mode: "HTML" });
};

export const setupFeedbackListener = (bot: Telegraf) => {
  bot.on(message("text"), async (ctx, next) => {
    const userId = ctx.from.id;

    // Если пользователь не в режиме обратной связи — пропускаем
    if (!awaitingFeedback.has(userId)) {
      return next();
    }

    awaitingFeedback.delete(userId);

    const userInfo = ctx.from.username
      ? `@${ctx.from.username}`
      : `${ctx.from.first_name} (ID: ${userId})`;

    const feedbackMessage = `
📨 <b>Новое сообщение</b>

👤 От: ${userInfo}
🆔 ID: <code>${userId}</code>

💬 Сообщение:
${ctx.message.text}
    `.trim();

    // Отправляем всем админам
    for (const adminId of config.adminIds) {
      try {
        await ctx.telegram.sendMessage(adminId, feedbackMessage, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "↩️ Ответить",
                  callback_data: `reply_${userId}`,
                },
              ],
            ],
          },
        });
      } catch (err) {
        console.error(`Failed to send feedback to admin ${adminId}:`, err);
      }
    }

    await ctx.reply(FEEDBACK_RECEIVED, { parse_mode: "HTML" });
  });
};

// Обработка ответа админа
export const setupAdminReply = (bot: Telegraf) => {
  const awaitingReply = new Map<number, number>(); // adminId -> targetUserId

  bot.action(/^reply_(\d+)$/, async (ctx) => {
    if (!ctx.from) return;

    // Только админы могут отвечать
    if (!config.adminIds.includes(ctx.from.id)) {
      await ctx.answerCbQuery("⛔ Нет доступа");
      return;
    }

    const targetUserId = parseInt(ctx.match[1], 10);
    awaitingReply.set(ctx.from.id, targetUserId);

    await ctx.answerCbQuery();
    await ctx.reply(
      `✏️ Напиши ответ для пользователя ID: <code>${targetUserId}</code>`,
      { parse_mode: "HTML" }
    );
  });

  // Слушаем ответ админа
  bot.on(message("text"), async (ctx, next) => {
    if (!ctx.from) return next();

    const targetUserId = awaitingReply.get(ctx.from.id);
    if (!targetUserId) return next();

    awaitingReply.delete(ctx.from.id);

    try {
      await ctx.telegram.sendMessage(
        targetUserId,
        `📩 <b>Ответ от разработчика:</b>\n\n${ctx.message.text}`,
        { parse_mode: "HTML" }
      );
      await ctx.reply("✅ Сообщение отправлено пользователю");
    } catch (err) {
      await ctx.reply("❌ Не удалось отправить сообщение пользователю");
      console.error("Failed to send reply to user:", err);
    }
  });
};

