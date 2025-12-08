import { Request, Response, NextFunction } from "express";
import { logger, logError } from "../lib/logger";

// Кастомный класс ошибки для API
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    // Сохраняем stack trace
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Типизированные ошибки
export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, true, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed") {
    super(message, 400, true, "VALIDATION_ERROR");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, true, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403, true, "FORBIDDEN");
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Conflict") {
    super(message, 409, true, "CONFLICT");
  }
}

export class InternalError extends AppError {
  constructor(message: string = "Internal server error") {
    super(message, 500, false, "INTERNAL_ERROR");
  }
}

// Обработчик 404 - должен быть ПЕРЕД errorHandler
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
};

// Централизованный обработчик ошибок Express
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Определяем, операционная ли это ошибка
  const isOperational = err instanceof AppError ? err.isOperational : false;
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";

  // Логируем ошибку
  logError(err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    statusCode,
    isOperational,
  });

  // Если это не операционная ошибка в продакшене - критическая ситуация
  if (!isOperational && process.env.NODE_ENV === "production") {
    logger.error("CRITICAL: Non-operational error occurred", {
      error: err.message,
      stack: err.stack,
    });
  }

  // Формируем ответ
  const response: Record<string, unknown> = {
    success: false,
    error: {
      message: isOperational ? err.message : "Something went wrong",
      code,
    },
  };

  // В dev режиме добавляем stack trace
  if (process.env.NODE_ENV !== "production") {
    response.error = {
      ...(response.error as object),
      stack: err.stack,
    };
  }

  res.status(statusCode).json(response);
};

// Обработчик для асинхронных роутов (обёртка)
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Глобальный обработчик необработанных исключений
export const setupGlobalErrorHandlers = (): void => {
  // Необработанные Promise rejection
  process.on("unhandledRejection", (reason: unknown) => {
    logger.error("Unhandled Promise Rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  // Необработанные исключения
  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught Exception", {
      message: error.message,
      stack: error.stack,
    });

    // Даём время записать лог и завершаем процесс
    logger.on("finish", () => {
      process.exit(1);
    });

    // Форсированный выход через 3 секунды
    setTimeout(() => {
      process.exit(1);
    }, 3000);
  });

  // Сигналы завершения
  const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT"];
  signals.forEach((signal) => {
    process.on(signal, () => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      // Здесь можно добавить логику graceful shutdown
    });
  });

  logger.info("Global error handlers initialized");
};

export default errorHandler;

