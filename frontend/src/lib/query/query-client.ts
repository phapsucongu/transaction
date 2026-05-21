/**
 * TanStack Query configuration and hooks
 */

import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/errors';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (ApiError.isApiError(error) && [400, 401, 403, 404].includes(error.status)) {
            return false;
          }

          return failureCount < 1;
        },
      },
    },
  });
}

export const queryClient = createQueryClient();

/**
 * Query key factory for consistent query key management
 */
const baseQueryKey = ['query'] as const;

export const queryKeys = {
  all: baseQueryKey,

  auth: {
    all: [...baseQueryKey, 'auth'] as const,
    me: [...baseQueryKey, 'auth', 'me'] as const,
  },

  accounts: {
    all: [...baseQueryKey, 'accounts'] as const,
    lists: () => [...baseQueryKey, 'accounts', 'list'] as const,
    list: (filters?: { limit?: number; offset?: number }) =>
      [...baseQueryKey, 'accounts', 'list', { ...filters }] as const,
    details: () => [...baseQueryKey, 'accounts', 'detail'] as const,
    detail: (id: string) => [...baseQueryKey, 'accounts', 'detail', id] as const,
    ledger: (id: string, filters?: { limit?: number; offset?: number }) =>
      [...baseQueryKey, 'accounts', 'detail', id, 'ledger', { ...filters }] as const,
    transfers: (id: string, filters?: { limit?: number; offset?: number }) =>
      [...baseQueryKey, 'accounts', 'detail', id, 'transfers', { ...filters }] as const,
  },

  transfers: {
    all: [...baseQueryKey, 'transfers'] as const,
    lists: () => [...baseQueryKey, 'transfers', 'list'] as const,
    list: (filters?: { limit?: number; offset?: number }) =>
      [...baseQueryKey, 'transfers', 'list', { ...filters }] as const,
    details: () => [...baseQueryKey, 'transfers', 'detail'] as const,
    detail: (id: string) => [...baseQueryKey, 'transfers', 'detail', id] as const,
  },

  ledger: {
    all: [...baseQueryKey, 'ledger'] as const,
    lists: () => [...baseQueryKey, 'ledger', 'list'] as const,
    list: (accountId: string, filters?: { limit?: number; offset?: number }) =>
      [...baseQueryKey, 'ledger', 'list', accountId, { ...filters }] as const,
  },
} as const;
