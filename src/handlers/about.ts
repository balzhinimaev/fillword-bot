import { Context } from "telegraf";

const ABOUT_TEXT = `
🎯 <b>Буряад Филворд</b>

Игра для изучения бурятского языка через филворды — находи слова в сетке букв!

🌟 <b>Особенности:</b>
• Слова на бурятском языке с переводом
• Разные уровни сложности
• Отслеживание прогресса

📱 Версия: 1.0.0
👨‍💻 Разработано с ❤️
`.trim();

export const aboutHandler = async (ctx: Context) => {
  await ctx.reply(ABOUT_TEXT, { parse_mode: "HTML" });
};

