import { Context, NarrowedContext } from "telegraf";
import { Update, Message } from "telegraf/types";
import { BackendService } from "../services/backend";
import { config } from "../config/env";

type StartContext = NarrowedContext<Context<Update>, Update.MessageUpdate<Message.TextMessage>> & {
  startPayload: string;
};

export const startHandler = async (ctx: StartContext) => {
  const user = ctx.from;
  if (!user) return;

  // Telegraf автоматически парсит payload (часть после /start)
  // Например: t.me/bot?start=campaign_winter_sale -> payload = "campaign_winter_sale"
  const startPayload = ctx.startPayload || "";

  // Логика извлечения кампании
  const adCampaign = startPayload.startsWith("campaign_")
    ? startPayload.replace("campaign_", "")
    : "organic";

  // Формируем данные
  const payload = {
    telegramId: user.id,
    name: `${user.first_name} ${user.last_name || ""}`.trim(),
    telegramUsername: user.username,
    prelaunchSource: "bot_start",
    adCampaign,
  };

  // Отправляем на бэкенд (fire and forget - не блокируем ответ пользователю)
  BackendService.getInstance().registerPrelaunchUser(payload);

  // Отвечаем пользователю
  await ctx.reply("Сайн байна! 👋\nДобро пожаловать в игру.", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🚀 Эхилхэ (Начать игру)",
            web_app: { url: config.webAppUrl },
          },
        ],
      ],
    },
  });
};
