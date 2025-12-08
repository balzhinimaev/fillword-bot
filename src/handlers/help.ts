import { Context } from "telegraf";

const HELP_TEXT = `
📖 <b>Доступные команды:</b>

/start — Начать игру
/help — Показать это сообщение
/about — О боте и игре
/feedback — Связаться с разработчиком

🎮 <b>Как играть:</b>
Нажми кнопку «Эхилхэ» чтобы открыть игру в мини-приложении Telegram.

❓ Возникли вопросы? Используй /feedback
`.trim();

export const helpHandler = async (ctx: Context) => {
  await ctx.reply(HELP_TEXT, { parse_mode: "HTML" });
};

