'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/query-client';
import type { PaginationParams } from '@/shared/types/pagination';
import { generateRequestId } from '@/shared/api/request-id';
import { transfersApi } from './transfers.api';
import type { CreateTransferRequest } from './transfers.types';

const defaultPagination = { limit: 10, offset: 0 };

export function useTransfersQuery(params: PaginationParams = defaultPagination) {
  return useQuery({
    queryKey: queryKeys.transfers.list(params),
    queryFn: () => transfersApi.list(params),
  });
}

export function useTransferQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.transfers.detail(id),
    queryFn: () => transfersApi.detail(id),
    enabled: !!id,
  });
}

export function useCreateTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransferRequest) => transfersApi.create(data, generateRequestId()),
    onSuccess: (transfer) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.detail(transfer.source_account_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.detail(transfer.destination_account_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.ledger(transfer.source_account_id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.ledger(transfer.destination_account_id),
      });
    },
  });
}

