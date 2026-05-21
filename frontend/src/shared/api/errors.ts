export interface ApiErrorResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  requestId?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
    public requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }

  static fromResponse(status: number, data: unknown, requestId?: string): ApiError {
    const errorData = (data ?? {}) as ApiErrorResponse;
    const message = Array.isArray(errorData.message)
      ? errorData.message.join(', ')
      : errorData.message || errorData.error || 'Request failed';

    return new ApiError(
      status,
      errorData.error || `HTTP_${status}`,
      message,
      data,
      requestId || errorData.requestId,
    );
  }
}

export function getErrorMessage(error: unknown): string {
  if (ApiError.isApiError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred';
}

