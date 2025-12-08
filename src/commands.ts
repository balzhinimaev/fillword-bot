import { Telegraf } from "telegraf";

export const BOT_COMMANDS = [
  { command: "start", description: "🎮 Начать игру" },
  { command: "help", description: "📖 Помощь" },
  { command: "about", description: "ℹ️ О боте" },
  { command: "feedback", description: "📝 Обратная связь" },
];

export const setupCommands = async (bot: Telegraf) => {
  try {
    await bot.telegram.setMyCommands(BOT_COMMANDS);
    console.log("✅ Bot commands menu set");
  } catch (err) {
    console.error("Failed to set bot commands:", err);
  }
};

