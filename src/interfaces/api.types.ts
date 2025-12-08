export interface PrelaunchUserPayload {
  telegramId: number;
  name: string;
  telegramUsername?: string;
  prelaunchSource: string;
  adCampaign: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
}
