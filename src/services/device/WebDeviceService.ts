// src/services/device/WebDeviceService.ts
import { IDeviceService, NotificationOptions } from './DeviceService'

export class WebDeviceService implements IDeviceService {
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  async scheduleNotification(options: NotificationOptions): Promise<void> {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    // Les notifications programmées ne sont pas supportées nativement en PWA
    new Notification(options.title, { body: options.body });
  }

  async playSound(soundId: string): Promise<void> {
    // Supposons que les sons sont dans public/sounds/
    const audio = new Audio(`/sounds/${soundId}.mp3`);
    await audio.play();
  }

  vibrate(pattern?: number[]): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern || [200]);
    }
  }
} 