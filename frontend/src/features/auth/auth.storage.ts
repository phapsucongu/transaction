import {
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
} from '@/shared/api/client';
import type { AuthSession, AuthUser } from './auth.types';

const USER_STORAGE_KEY = 'transaction_simulator_user';
const LEGACY_USER_STORAGE_KEY = 'user';

function parseStoredUser(raw: string | null): AuthUser | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function readStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const accessToken = getStoredAccessToken();
  const storedUserRaw = window.sessionStorage.getItem(USER_STORAGE_KEY);
  const legacyUserRaw = window.localStorage.getItem(LEGACY_USER_STORAGE_KEY);
  const user = parseStoredUser(storedUserRaw) || parseStoredUser(legacyUserRaw);

  if (!storedUserRaw && user) {
    window.sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    window.localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
  }

  if (!accessToken || !user) {
    return null;
  }

  return { accessToken, user };
}

export function writeStoredSession(session: AuthSession): void {
  setStoredAccessToken(session.accessToken);
  window.sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
  window.localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
}

export function clearStoredSession(): void {
  clearStoredAccessToken();
  window.sessionStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
}

