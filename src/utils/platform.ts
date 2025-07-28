// Simple platform detection without Capacitor dependency
export const isNative = false; // Defaulting to web platform
export const isIOS = false; // Defaulting to false since we're on web
export const isAndroid = false; // Defaulting to false since we're on web
 
export const shouldReduceMotion =
  isNative || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches); 