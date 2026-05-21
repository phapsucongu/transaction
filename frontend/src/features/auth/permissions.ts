import type { AuthUser } from './auth.types';

export function canViewApp(user: AuthUser | null): boolean {
  return user?.role === 'ADMIN' || user?.role === 'USER';
}

export function canCreateAccount(user: AuthUser | null): boolean {
  return user?.role === 'ADMIN';
}

export function canTopupAccount(user: AuthUser | null): boolean {
  return user?.role === 'ADMIN';
}

export function canChangeAccountStatus(user: AuthUser | null): boolean {
  return user?.role === 'ADMIN';
}

export function canCreateTransfer(user: AuthUser | null): boolean {
  return user?.role === 'ADMIN' || user?.role === 'USER';
}

