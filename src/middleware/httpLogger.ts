import { Request, Response, NextFunction } from "express";
import { httpLogger } from "../lib/logger";

// Middleware для логирования HTTP запросов
export const httpLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Сохраняем оригинальный метод end
  const originalEnd = res.end;
  let responseBody: string | Buffer | undefined;

  // Перехватываем тело ответа (только для небольших ответов)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.end = function (chunk?: any, encodingOrCallback?: any, callback?: any): Response {
    if (chunk) {
      responseBody =
        typeof chunk === "string" ? chunk : Buffer.isBuffer(chunk) ? chunk.toString("utf8") : undefined;
      // Ограничиваем размер логируемого тела
      if (responseBody && responseBody.length > 1000) {
        responseBody = responseBody.substring(0, 1000) + "... [truncated]";
      }
    }
    return originalEnd.call(this, chunk, encodingOrCallback, callback);
  };

  // Логируем после завершения ответа
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get("User-Agent"),
      contentLength: res.get("Content-Length"),
    };

    // Определяем уровень лога по статусу
    if (res.statusCode >= 500) {
      httpLogger.error("HTTP Request", logData);
    } else if (res.statusCode >= 400) {
      httpLogger.warn("HTTP Request", logData);
    } else {
      httpLogger.http("HTTP Request", logData);
    }
  });

  next();
};

// Middleware для логирования тела запроса (для отладки)
export const requestBodyLogger = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.body && Object.keys(req.body).length > 0) {
    // Не логируем чувствительные данные
    const sanitizedBody = { ...req.body };
    const sensitiveFields = ["password", "token", "secret", "apiKey", "api_key"];
    
    for (const field of sensitiveFields) {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = "[REDACTED]";
      }
    }

    httpLogger.debug("Request body", {
      method: req.method,
      url: req.originalUrl,
      body: sanitizedBody,
    });
  }
  next();
};

export default httpLoggerMiddleware;

