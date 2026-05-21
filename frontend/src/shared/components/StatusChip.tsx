'use client';

import { Chip, type ChipProps } from '@mui/material';

const statusColors: Record<string, ChipProps['color']> = {
  ACTIVE: 'success',
  LOCKED: 'warning',
  CLOSED: 'default',
  PROCESSING: 'info',
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'error',
  REVERSED: 'default',
  CREDIT: 'success',
  DEBIT: 'error',
};

export function StatusChip({ value }: { value: string }) {
  return <Chip size="small" label={value} color={statusColors[value] ?? 'default'} />;
}

