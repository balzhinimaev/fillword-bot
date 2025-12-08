import express from "express";
import { bot } from "./bot";
import { config } from "./config/env";
import { setupCommands } from "./commands";
import { logger } from "./lib/logger";
import {
  httpLoggerMiddleware,
  errorHandler,
  notFoundHandler,
  setupGlobalErrorHandlers,
} from "./middleware";

const app = express();

// Инициализация глобальных обработчиков ошибок
setupGlobalErrorHandlers();

// HTTP логирование (перед роутами)
app.use(httpLoggerMiddleware);

async function start() {
  try {
    // Устанавливаем меню команд бота
    await setupCommands(bot);
    logger.info("Bot commands registered");

    const SECRET_PATH = `/telegraf/${bot.secretPathComponent()}`;

    // Настройка вебхука для Telegram
    app.use(
      await bot.createWebhook({
        domain: config.webhookDomain,
        path: SECRET_PATH,
      })
    );
    logger.info("Telegram webhook configured", { path: SECRET_PATH });

    // Health-check эндпоинт
    app.get("/health", (_req, res) => {
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // 404 обработчик (для API роутов, не для webhook)
    app.use("/api/*path", notFoundHandler);

    // Централизованный обработчик ошибок (должен быть последним)
    app.use(errorHandler);

    // Запуск сервера
    app.listen(config.port, () => {
      logger.info(`🚀 Bot server started`, {
        port: config.port,
        webhookUrl: `${config.webhookDomain}${SECRET_PATH}`,
        environment: process.env.NODE_ENV || "development",
      });
    });
  } catch (error) {
    logger.error("Failed to start server", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

start();

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  bot.stop(signal);
  process.exit(0);
};

process.once("SIGINT", () => gracefulShutdown("SIGINT"));
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
