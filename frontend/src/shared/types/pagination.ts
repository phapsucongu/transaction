export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

