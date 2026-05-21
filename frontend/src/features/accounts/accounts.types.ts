export type AccountStatus = 'ACTIVE' | 'LOCKED' | 'CLOSED';

export interface Account {
  id: string;
  code: string;
  name: string;
  currency: string;
  available_balance_minor: number | string;
  status: AccountStatus;
  version: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAccountRequest {
  code: string;
  name: string;
  currency: string;
}

export interface TopupAccountRequest {
  amount_minor: number;
}

