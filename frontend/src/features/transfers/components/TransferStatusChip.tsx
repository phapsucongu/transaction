'use client';

import { StatusChip } from '@/shared/components/StatusChip';
import type { TransferStatus } from '../transfers.types';

export function TransferStatusChip({ status }: { status: TransferStatus }) {
  return <StatusChip value={status} />;
}

