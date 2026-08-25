import React from 'react';

export interface NetworkErrorHandlerProps {
  children: React.ReactNode;
  onRetry?: () => void;
  onOpenSettings?: () => void;
  showOfflineBanner?: boolean;
}

export function NetworkErrorHandler({
  children,
}: NetworkErrorHandlerProps) {
  return <>{children}</>;
}

export interface RetryableError extends Error {
  isRetryable?: boolean | undefined;
  retryAfter?: number | undefined;
}

export function isNetworkError(error: unknown): error is RetryableError {
  if (!error || typeof error !== 'object') return false;
  const err = error as RetryableError;
  return (
    err.name === 'NetworkError' ||
    err.message?.includes('network') ||
    err.message?.includes('fetch') ||
    err.message?.includes('timeout') ||
    err.message?.includes('connection')
  );
}

export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as RetryableError;
  return err.isRetryable === true || isNetworkError(error);
}

export function getRetryDelay(error: RetryableError, attempt: number): number {
  if (error.retryAfter) return error.retryAfter * 1000;
  return Math.min(1000 * Math.pow(2, attempt), 30000);
}

export interface ToastProps {
  message: string;
  type?: ('success' | 'error' | 'warning' | 'info') | undefined;
  duration?: number | undefined;
  action?: { label: string; onPress: () => void } | undefined;
}

export function showToast(props: ToastProps) {
  // Placeholder for toast implementation
  // In a real app, this would use a toast library like react-native-toast-message or sonner
  console.log('[Toast]', props);
}

export function showErrorToast(message: string, onRetry?: () => void) {
  showToast({
    message,
    type: 'error',
    action: onRetry ? { label: 'Reintentar', onPress: onRetry } : undefined,
  });
}

export function showSuccessToast(message: string) {
  showToast({ message, type: 'success' });
}

export function showWarningToast(message: string) {
  showToast({ message, type: 'warning' });
}

export function showInfoToast(message: string) {
  showToast({ message, type: 'info' });
}

export class NetworkError extends Error implements RetryableError {
  isRetryable = true;
  retryAfter: number | undefined;

  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = 'NetworkError';
    this.retryAfter = retryAfter;
  }
}

export class TimeoutError extends Error implements RetryableError {
  isRetryable = true;

  constructor(message = 'La solicitud tardó demasiado') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class UnauthorizedError extends Error {
  isRetryable = false;

  constructor(message = 'Sesión expirada. Inicia sesión de nuevo.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  isRetryable = false;

  constructor(message = 'No tienes permisos para esta acción') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  isRetryable = false;

  constructor(message = 'Recurso no encontrado') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export function handleApiError(error: unknown): { message: string; isRetryable: boolean; retryAfter?: number | undefined } {
  if (error instanceof Response) {
    switch (error.status) {
      case 401:
        return { message: 'Sesión expirada', isRetryable: false };
      case 403:
        return { message: 'No tienes permisos', isRetryable: false };
      case 404:
        return { message: 'Recurso no encontrado', isRetryable: false };
      case 429:
        const retryAfter = parseInt(error.headers.get('Retry-After') || '60', 10);
        return { message: 'Demasiadas solicitudes', isRetryable: true, retryAfter };
      case 500:
      case 502:
      case 503:
        return { message: 'Error del servidor', isRetryable: true, retryAfter: 30 };
      default:
        return { message: `Error ${error.status}`, isRetryable: error.status >= 500 };
    }
  }

  if (error instanceof NetworkError) {
    return { message: error.message, isRetryable: true, retryAfter: error.retryAfter };
  }
  if (error instanceof TimeoutError) {
    return { message: error.message, isRetryable: true };
  }

  if (error instanceof UnauthorizedError || error instanceof ForbiddenError || error instanceof NotFoundError) {
    return { message: error.message, isRetryable: false };
  }

  if (error instanceof Error) {
    return { message: error.message, isRetryable: isNetworkError(error) };
  }

  return { message: 'Error desconocido', isRetryable: false };
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
    retryCondition?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry,
    retryCondition = isRetryableError,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !retryCondition(error)) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      onRetry?.(attempt, error as Error);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}