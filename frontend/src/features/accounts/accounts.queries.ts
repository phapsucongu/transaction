'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/query-client';
import type { PaginationParams } from '@/shared/types/pagination';
import { accountsApi } from './accounts.api';
import type { CreateAccountRequest, TopupAccountRequest } from './accounts.types';

const defaultPagination = { limit: 10, offset: 0 };

export function useAccountsQuery(params: PaginationParams = defaultPagination) {
  return useQuery({
    queryKey: queryKeys.accounts.list(params),
    queryFn: () => accountsApi.list(params),
  });
}

export function useAccountQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.accounts.detail(id),
    queryFn: () => accountsApi.detail(id),
    enabled: !!id,
  });
}

export function useAccountLedgerQuery(id: string, params: PaginationParams = defaultPagination) {
  return useQuery({
    queryKey: queryKeys.accounts.ledger(id, params),
    queryFn: () => accountsApi.ledger(id, params),
    enabled: !!id,
  });
}

export function useAccountTransfersQuery(id: string, params: PaginationParams = defaultPagination) {
  return useQuery({
    queryKey: queryKeys.accounts.transfers(id, params),
    queryFn: () => accountsApi.transfers(id, params),
    enabled: !!id,
  });
}

export function useCreateAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAccountRequest) => accountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.lists() });
    },
  });
}

export function useTopupAccountMutation(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TopupAccountRequest) => accountsApi.topup(accountId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.detail(accountId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.ledger(accountId) });
    },
  });
}

export function useLockAccountMutation(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => accountsApi.lock(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.detail(accountId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.lists() });
    },
  });
}

export function useUnlockAccountMutation(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => accountsApi.unlock(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.detail(accountId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.lists() });
    },
  });
}

