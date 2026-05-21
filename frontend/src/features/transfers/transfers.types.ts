export type TransferStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED';

export interface Transfer {
  id: string;
  client_id?: string;
  idem_key?: string;
  source_account_id: string;
  destination_account_id: string;
  amount_minor: number | string;
  currency: string;
  status: TransferStatus;
  failure_code?: string | null;
  failure_message?: string | null;
  response_body?: unknown;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTransferRequest {
  source_account_id: string;
  destination_account_id: string;
  amount_minor: number;
  currency: string;
}

