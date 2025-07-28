import { logger } from './logger';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    
    // Maintient la stack trace correcte dans V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', context);
    this.name = 'DatabaseError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

interface ErrorHandler {
  logError: (error: Error, context?: Record<string, unknown>) => void;
  handleError: (error: Error, context?: Record<string, unknown>) => void;
}

class ErrorHandlerImpl implements ErrorHandler {
  private isDevelopment = import.meta.env.DEV;

  logError(error: Error, context?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      logger.error('Error occurred', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      });
    }
    
    // En production, on pourrait envoyer à un service comme Sentry
    // if (!this.isDevelopment) {
    //   Sentry.captureException(error, { extra: context });
    // }
  }

  handleError(error: Error, context?: Record<string, unknown>): void {
    this.logError(error, context);
    
    // Gestion spécifique selon le type d'erreur
    if (error instanceof ValidationError) {
      this.showUserNotification('Données invalides. Veuillez vérifier votre saisie.', 'error');
    } else if (error instanceof DatabaseError) {
      this.showUserNotification('Erreur de base de données. Veuillez réessayer.', 'error');
    } else if (error instanceof NetworkError) {
      this.showUserNotification('Erreur réseau. Vérifiez votre connexion.', 'error');
    } else {
      this.showUserNotification('Une erreur inattendue s\'est produite.', 'error');
    }
  }

  private showUserNotification(message: string, type: 'error' | 'warning' | 'info'): void {
    // Intégration future avec un système de notification UI
    // Pour l'instant, on log simplement
    if (this.isDevelopment) {
      logger.warn(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

export const errorHandler = new ErrorHandlerImpl();

// Fonction utilitaire pour les try-catch
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage: string,
  context?: Record<string, unknown>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    errorHandler.handleError(
      error instanceof Error ? error : new Error(String(error)),
      { ...context, originalError: error }
    );
    throw new AppError(errorMessage, 'OPERATION_FAILED', context);
  }
}

// Fonction pour wrapper les actions Zustand avec gestion d'erreur
export function createSafeAction<Args extends unknown[], Return>(
  action: (...args: Args) => Promise<Return>,
  errorMessage: string
): (...args: Args) => Promise<Return | null> {
  return async (...args: Args) => {
    try {
      return await action(...args);
    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { action: action.name, args }
      );
      return null;
    }
  };
}