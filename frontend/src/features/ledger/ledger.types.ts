export type LedgerEntrySide = 'DEBIT' | 'CREDIT';

export interface LedgerEntry {
  id: string;
  transfer_id?: string | null;
  account_id: string;
  entry_type: string;
  side: LedgerEntrySide;
  amount_minor: number | string;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

