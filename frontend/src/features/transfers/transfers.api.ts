import { apiClient } from '@/shared/api/client';
import type { PaginatedResponse, PaginationParams } from '@/shared/types/pagination';
import type { CreateTransferRequest, Transfer } from './transfers.types';

export const transfersApi = {
  async list(params: PaginationParams): Promise<PaginatedResponse<Transfer>> {
    const response = await apiClient.get<PaginatedResponse<Transfer>>('/v1/transfers', { params });
    return response.data;
  },

  async detail(id: string): Promise<Transfer> {
    const response = await apiClient.get<{ data: Transfer }>(`/v1/transfers/${id}`);
    return response.data.data;
  },

  async create(data: CreateTransferRequest, idempotencyKey: string): Promise<Transfer> {
    const response = await apiClient.post<Transfer>('/v1/transfers', data, {
      headers: {
        'idempotency-key': idempotencyKey,
      },
    });
    return response.data;
  },
};

