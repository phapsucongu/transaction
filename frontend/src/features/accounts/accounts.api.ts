import { apiClient } from '@/shared/api/client';
import type { PaginatedResponse, PaginationParams } from '@/shared/types/pagination';
import type { LedgerEntry } from '@/features/ledger/ledger.types';
import type { Transfer } from '@/features/transfers/transfers.types';
import type { Account, CreateAccountRequest, TopupAccountRequest } from './accounts.types';

export const accountsApi = {
  async list(params: PaginationParams): Promise<PaginatedResponse<Account>> {
    const response = await apiClient.get<PaginatedResponse<Account>>('/v1/accounts', { params });
    return response.data;
  },

  async detail(id: string): Promise<Account> {
    const response = await apiClient.get<Account>(`/v1/accounts/${id}`);
    return response.data;
  },

  async create(data: CreateAccountRequest): Promise<Account> {
    const response = await apiClient.post<Account>('/v1/accounts', data);
    return response.data;
  },

  async topup(id: string, data: TopupAccountRequest): Promise<Account> {
    const response = await apiClient.post<Account>(`/v1/accounts/${id}/topup`, data);
    return response.data;
  },

  async lock(id: string): Promise<Account> {
    const response = await apiClient.put<Account>(`/v1/accounts/${id}/lock`);
    return response.data;
  },

  async unlock(id: string): Promise<Account> {
    const response = await apiClient.put<Account>(`/v1/accounts/${id}/unlock`);
    return response.data;
  },

  async ledger(
    id: string,
    params: PaginationParams,
  ): Promise<PaginatedResponse<LedgerEntry>> {
    const response = await apiClient.get<PaginatedResponse<LedgerEntry>>(
      `/v1/accounts/${id}/ledger`,
      { params },
    );
    return response.data;
  },

  async transfers(
    id: string,
    params: PaginationParams,
  ): Promise<PaginatedResponse<Transfer>> {
    const response = await apiClient.get<PaginatedResponse<Transfer>>(
      `/v1/accounts/${id}/transfers`,
      { params },
    );
    return response.data;
  },
};

