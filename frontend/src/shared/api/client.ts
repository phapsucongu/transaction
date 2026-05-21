import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { ApiError } from './errors';
import { generateRequestId } from './request-id';

const ACCESS_TOKEN_STORAGE_KEY = 'transaction_simulator_access_token';
const LEGACY_ACCESS_TOKEN_STORAGE_KEY = 'access_token';

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const sessionToken = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (sessionToken) {
    return sessionToken;
  }

  const legacyToken = window.localStorage.getItem(LEGACY_ACCESS_TOKEN_STORAGE_KEY);
  if (legacyToken) {
    window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, legacyToken);
    window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_STORAGE_KEY);
    return legacyToken;
  }

  return null;
}

export function setStoredAccessToken(token: string): void {
  window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_STORAGE_KEY);
}

export function clearStoredAccessToken(): void {
  window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_STORAGE_KEY);
}

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: env.API_BASE_URL,
    timeout: 10_000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use((config) => {
    config.headers = config.headers ?? {};
    config.headers['X-Request-Id'] = generateRequestId();

    const token = getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response) {
        const requestId =
          (error.response.headers?.['x-request-id'] as string | undefined) ||
          (error.response.headers?.['X-Request-Id'] as string | undefined);
        throw ApiError.fromResponse(error.response.status, error.response.data, requestId);
      }

      if (error.message === 'Network Error') {
        throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach backend API.');
      }

      if (error.code === 'ECONNABORTED') {
        throw new ApiError(0, 'TIMEOUT', 'Backend API request timed out.');
      }

      throw new ApiError(0, 'UNKNOWN_ERROR', error.message || 'Request failed');
    },
  );

  return client;
}

export const apiClient = createApiClient();

export type ApiRequestConfig = AxiosRequestConfig;
