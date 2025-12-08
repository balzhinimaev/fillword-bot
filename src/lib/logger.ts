import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

// Директория для логов
const LOG_DIR = process.env.LOG_DIR || "logs";

// Кастомные уровни логирования
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Цвета для консоли
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "cyan",
};

winston.addColors(colors);

// Формат для консоли (красивый, цветной)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// Формат для файлов (JSON для парсинга)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Конфигурация транспорта для ежедневной ротации
const createDailyRotateTransport = (
  filename: string,
  level?: string
): DailyRotateFile => {
  return new DailyRotateFile({
    dirname: path.join(LOG_DIR, level || "combined"),
    filename: `${filename}-%DATE%.log`,
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    level,
    format: fileFormat,
  });
};

// Транспорты
const transports: winston.transport[] = [
  // Консоль - всегда
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  }),

  // Все логи (combined)
  createDailyRotateTransport("combined"),

  // Только ошибки
  createDailyRotateTransport("error", "error"),

  // HTTP запросы
  createDailyRotateTransport("http", "http"),
];

// Создаём основной логгер
export const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || "debug",
  transports,
  // Не падаем при ошибках логирования
  exitOnError: false,
});

// Специализированные логгеры для разных модулей
export const createModuleLogger = (moduleName: string) => {
  return logger.child({ module: moduleName });
};

// Логгеры для конкретных частей приложения
export const botLogger = createModuleLogger("bot");
export const httpLogger = createModuleLogger("http");
export const dbLogger = createModuleLogger("database");

// Утилита для логирования ошибок с контекстом
export const logError = (
  error: Error | unknown,
  context?: Record<string, unknown>
) => {
  if (error instanceof Error) {
    logger.error(error.message, {
      stack: error.stack,
      name: error.name,
      ...context,
    });
  } else {
    logger.error("Unknown error", { error, ...context });
  }
};

// Логирование Telegram обновлений
export const logTelegramUpdate = (
  updateType: string,
  userId?: number,
  username?: string,
  chatId?: number,
  data?: Record<string, unknown>
) => {
  botLogger.info(`Telegram update: ${updateType}`, {
    updateType,
    userId,
    username,
    chatId,
    ...data,
  });
};

// Логирование производительности
export const logPerformance = (
  operation: string,
  durationMs: number,
  meta?: Record<string, unknown>
) => {
  const level = durationMs > 1000 ? "warn" : "debug";
  logger.log(level, `Performance: ${operation} took ${durationMs}ms`, {
    operation,
    durationMs,
    ...meta,
  });
};

// Замер времени выполнения
export const measureTime = async <T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await fn();
    logPerformance(operation, Date.now() - start, { success: true });
    return result;
  } catch (error) {
    logPerformance(operation, Date.now() - start, { success: false });
    throw error;
  }
};

export default logger;

