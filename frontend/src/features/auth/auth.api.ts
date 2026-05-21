import { apiClient } from '@/shared/api/client';
import type { LoginRequest, LoginResponse, RegisterRequest, AuthUser } from './auth.types';

export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/v1/auth/login', data);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthUser> {
    const response = await apiClient.post<AuthUser>('/v1/auth/register', data);
    return response.data;
  },

  async me(): Promise<AuthUser> {
    const response = await apiClient.get<AuthUser>('/v1/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/v1/auth/logout');
  },
};

