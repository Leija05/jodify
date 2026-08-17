const SAVED_TOKEN_KEY = 'jodify_saved_dev_token';

export function getSavedToken(): string | null {
  try {
    return localStorage.getItem(SAVED_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function hasSavedToken(): boolean {
  return Boolean(getSavedToken());
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(SAVED_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearSavedToken(): void {
  try {
    localStorage.removeItem(SAVED_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function maskToken(token: string): string {
  if (token.length <= 6) return '•'.repeat(token.length);
  return `${token.slice(0, 3)}${'•'.repeat(Math.min(10, token.length - 6))}${token.slice(-3)}`;
}