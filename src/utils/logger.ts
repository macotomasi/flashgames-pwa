type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    // Garder un historique limité en mémoire pour le debug
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // En développement, on affiche dans la console
    if (this.isDevelopment) {
      const style = this.getLogStyle(level);
      const prefix = `[${level.toUpperCase()}] ${entry.timestamp}`;
      
      if (context) {
        console.groupCollapsed(`%c${prefix} - ${message}`, style);
        console.log('Context:', context);
        console.groupEnd();
      } else {
        console.log(`%c${prefix} - ${message}`, style);
      }
    }

    // En production, on pourrait envoyer à un service externe
    // if (!this.isDevelopment && level === 'error') {
    //   this.sendToExternalService(entry);
    // }
  }

  private getLogStyle(level: LogLevel): string {
    const styles = {
      debug: 'color: #8B5CF6',
      info: 'color: #3B82F6',
      warn: 'color: #F59E0B',
      error: 'color: #EF4444; font-weight: bold',
    };
    return styles[level];
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  // Méthode pour récupérer l'historique des logs (utile pour le debug)
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  // Méthode pour effacer l'historique
  clearHistory(): void {
    this.logHistory = [];
  }
}

// Instance singleton
export const logger = new Logger();

// Fonction helper pour logger les performances
export function logPerformance(label: string, fn: () => void): void {
  const start = performance.now();
  fn();
  const duration = performance.now() - start;
  
  logger.debug(`Performance: ${label}`, {
    duration: `${duration.toFixed(2)}ms`,
    timestamp: new Date().toISOString(),
  });
}

// Fonction helper pour logger les promesses
export async function logPromise<T>(
  label: string,
  promise: Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await promise;
    const duration = performance.now() - start;
    
    logger.debug(`Promise resolved: ${label}`, {
      duration: `${duration.toFixed(2)}ms`,
      success: true,
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    
    logger.error(`Promise rejected: ${label}`, {
      duration: `${duration.toFixed(2)}ms`,
      error: error instanceof Error ? error.message : String(error),
    });
    
    throw error;
  }
}