// src/services/device/DeviceService.ts

export interface NotificationOptions {
  title: string;
  body: string;
  id?: string;
  schedule?: {
    at: Date;
  };
}

export interface IDeviceService {
  requestNotificationPermission(): Promise<boolean>;
  scheduleNotification(options: NotificationOptions): Promise<void>;
  playSound(soundId: string): Promise<void>;
  vibrate(pattern?: number[]): void;
} 