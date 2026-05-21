'use client';

import { StatusChip } from '@/shared/components/StatusChip';
import type { AccountStatus } from '../accounts.types';

export function AccountStatusChip({ status }: { status: AccountStatus }) {
  return <StatusChip value={status} />;
}

