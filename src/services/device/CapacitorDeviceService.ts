// src/services/device/CapacitorDeviceService.ts
import { IDeviceService, NotificationOptions } from './DeviceService'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export class CapacitorDeviceService implements IDeviceService {
  async requestNotificationPermission(): Promise<boolean> {
    const perm = await LocalNotifications.requestPermissions();
    return perm.display === 'granted';
  }

  async scheduleNotification(options: NotificationOptions): Promise<void> {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: options.title,
          body: options.body,
          id: options.id ? parseInt(options.id, 10) : Date.now(),
          schedule: options.schedule ? { at: options.schedule.at } : undefined,
        },
      ],
    });
  }

  async playSound(soundId: string): Promise<void> {
    // Capacitor ne gère pas le son nativement, mais tu peux utiliser un plugin ou fallback web
    const audio = new Audio(`/sounds/${soundId}.mp3`);
    await audio.play();
  }

  vibrate(pattern?: number[]): void {
    // Utilise Haptics pour une vibration simple
    Haptics.impact({ style: ImpactStyle.Medium });
    // Pour des patterns complexes, il faudrait un plugin natif custom
  }
} 