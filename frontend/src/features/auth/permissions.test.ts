import { describe, expect, it } from 'vitest';
import type { AuthUser } from './auth.types';
import {
  canChangeAccountStatus,
  canCreateAccount,
  canCreateTransfer,
  canTopupAccount,
} from './permissions';

const admin: AuthUser = {
  id: 'admin-id',
  email: 'admin@example.com',
  full_name: 'Admin',
  role: 'ADMIN',
};

const user: AuthUser = {
  id: 'user-id',
  email: 'user@example.com',
  full_name: 'User',
  role: 'USER',
};

describe('permissions', () => {
  it('matches backend ADMIN-only account mutations', () => {
    expect(canCreateAccount(admin)).toBe(true);
    expect(canTopupAccount(admin)).toBe(true);
    expect(canChangeAccountStatus(admin)).toBe(true);
    expect(canCreateAccount(user)).toBe(false);
    expect(canTopupAccount(user)).toBe(false);
    expect(canChangeAccountStatus(user)).toBe(false);
  });

  it('allows both backend roles to create transfers', () => {
    expect(canCreateTransfer(admin)).toBe(true);
    expect(canCreateTransfer(user)).toBe(true);
  });
});

