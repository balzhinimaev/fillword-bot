import axios from "axios";
import { config } from "../config/env";
import { PrelaunchUserPayload } from "../interfaces/api.types";

export class BackendService {
  private static instance: BackendService;

  private constructor() {}

  public static getInstance(): BackendService {
    if (!BackendService.instance) {
      BackendService.instance = new BackendService();
    }
    return BackendService.instance;
  }

  /**
   * Регистрация пользователя в Prelaunch системе
   */
  public async registerPrelaunchUser(
    userData: PrelaunchUserPayload
  ): Promise<void> {
    try {
      await axios.post(`${config.apiUrl}/users/prelaunch`, userData, {
        headers: { "Content-Type": "application/json" },
      });
      console.log(`[API] User ${userData.telegramId} registered/updated.`);
    } catch (error) {
      // Логируем ошибку, но не роняем бота.
      // В продакшене лучше использовать нормальный логгер (winston/pino)
      if (axios.isAxiosError(error)) {
        console.error("[API Error]", error.response?.data ?? error.message);
        return;
      }

      if (error instanceof Error) {
        console.error("[API Error]", error.message);
        return;
      }

      console.error("[API Error]", String(error));
    }
  }
}
