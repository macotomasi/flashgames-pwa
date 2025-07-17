// src/services/device/index.ts
import { IDeviceService } from './DeviceService'
import { WebDeviceService } from './WebDeviceService'
import { CapacitorDeviceService } from './CapacitorDeviceService'

// Détection de plateforme
function isNativePlatform(): boolean {
  // Capacitor injecte un objet global
  return !!(window as any).Capacitor && (window as any).Capacitor.isNativePlatform && (window as any).Capacitor.isNativePlatform();
}

let deviceService: IDeviceService;

if (isNativePlatform()) {
  deviceService = new CapacitorDeviceService();
} else {
  deviceService = new WebDeviceService();
}

export { deviceService }; 