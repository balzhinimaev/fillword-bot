import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

function parseAdminIds(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id));
}

export const config = {
  // Required
  botToken: requireEnv("BOT_TOKEN"),
  webhookDomain: requireEnv("WEBHOOK_DOMAIN"),

  // Server
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // API
  apiUrl: process.env.API_URL || "http://localhost:3000",
  webAppUrl: process.env.WEB_APP_URL || "https://app.yourapp.com",

  // Admin
  adminIds: parseAdminIds(process.env.ADMIN_IDS),
  botUsername: process.env.BOT_USERNAME || "YourBot",

  // Logging
  logLevel: process.env.LOG_LEVEL || "debug",
  logDir: process.env.LOG_DIR || "logs",

  // Helper methods
  isDevelopment: () => config.nodeEnv === "development",
  isProduction: () => config.nodeEnv === "production",
} as const;
