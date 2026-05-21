'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from './auth.api';
import { clearStoredSession, readStoredSession, writeStoredSession } from './auth.storage';
import type { AuthSession, AuthUser, LoginRequest } from './auth.types';
import { queryKeys } from '@/lib/query/query-client';
import { ApiError } from '@/shared/api/errors';
import { getStoredAccessToken } from '@/shared/api/client';

export function useSessionQuery() {
  return useQuery<AuthSession | null>({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const accessToken = getStoredAccessToken();

      if (!accessToken) {
        return null;
      }

      try {
        const user = await authApi.me();
        const session: AuthSession = { accessToken, user };
        writeStoredSession(session);
        return session;
      } catch (error) {
        if (ApiError.isApiError(error) && error.status === 401) {
          clearStoredSession();
          return null;
        }

        const fallbackSession = readStoredSession();
        if (fallbackSession) {
          return fallbackSession;
        }

        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function useAuthUser(): AuthUser | null {
  const { data } = useSessionQuery();
  return data?.user ?? null;
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const response = await authApi.login(credentials);
      const session: AuthSession = {
        accessToken: response.access_token,
        user: response.user,
      };
      writeStoredSession(session);
      return session;
    },
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.auth.me, session);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch {
        // Logout should still succeed client-side even if the backend is unreachable.
      } finally {
        clearStoredSession();
      }
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

