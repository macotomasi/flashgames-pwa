// src/services/device/index.ts
import { IDeviceService } from './DeviceService'
import { WebDeviceService } from './WebDeviceService'
import { CapacitorDeviceService } from './CapacitorDeviceService'

// Types pour Capacitor
interface CapacitorWindow extends Window {
  Capacitor?: {
    isNativePlatform(): boolean;
  };
}

// Détection de plateforme
function isNativePlatform(): boolean {
  // Capacitor injecte un objet global
  const capacitorWindow = window as CapacitorWindow;
  return !!(capacitorWindow.Capacitor && capacitorWindow.Capacitor.isNativePlatform && capacitorWindow.Capacitor.isNativePlatform());
}

let deviceService: IDeviceService;

if (isNativePlatform()) {
  deviceService = new CapacitorDeviceService();
} else {
  deviceService = new WebDeviceService();
}

export { deviceService }; 