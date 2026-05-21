'use client';

import { Alert, Box, Button, Stack, Tab, Tabs } from '@mui/material';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useAuthUser } from '@/features/auth/auth.hooks';
import { canChangeAccountStatus, canTopupAccount } from '@/features/auth/permissions';
import { AccountDetailCard } from '@/features/accounts/components/AccountDetailCard';
import { AccountLedgerTab } from '@/features/accounts/components/AccountLedgerTab';
import { AccountTransfersTab } from '@/features/accounts/components/AccountTransfersTab';
import { TopupDialog } from '@/features/accounts/components/TopupDialog';
import {
  useAccountQuery,
  useLockAccountMutation,
  useTopupAccountMutation,
  useUnlockAccountMutation,
} from '@/features/accounts/accounts.queries';
import type { TopupFormValues } from '@/features/accounts/accounts.schemas';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { DataState } from '@/shared/components/DataState';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { PageHeader } from '@/shared/components/PageHeader';
import { getErrorMessage } from '@/shared/api/errors';

export default function AccountDetailPage() {
  const params = useParams<{ accountId: string }>();
  const accountId = params.accountId;
  const user = useAuthUser();
  const [tab, setTab] = useState(0);
  const [topupOpen, setTopupOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'lock' | 'unlock' | null>(null);

  const query = useAccountQuery(accountId);
  const topupMutation = useTopupAccountMutation(accountId);
  const lockMutation = useLockAccountMutation(accountId);
  const unlockMutation = useUnlockAccountMutation(accountId);

  const account = query.data;
  const statusActionPending = lockMutation.isPending || unlockMutation.isPending;
  const actionError = topupMutation.error || lockMutation.error || unlockMutation.error;

  const submitTopup = async (values: TopupFormValues) => {
    try {
      await topupMutation.mutateAsync(values);
      setTopupOpen(false);
    } catch {
      // Rendered below.
    }
  };

  const submitStatusAction = async () => {
    try {
      if (confirmAction === 'lock') {
        await lockMutation.mutateAsync();
      }
      if (confirmAction === 'unlock') {
        await unlockMutation.mutateAsync();
      }
      setConfirmAction(null);
    } catch {
      // Rendered below.
    }
  };

  return (
    <>
      <PageHeader
        title="Account detail"
        action={
          account ? (
            <Stack direction="row" spacing={1}>
              {canTopupAccount(user) ? (
                <Button
                  variant="contained"
                  onClick={() => setTopupOpen(true)}
                  disabled={account.status !== 'ACTIVE'}
                >
                  Top up
                </Button>
              ) : null}
              {canChangeAccountStatus(user) && account.status === 'ACTIVE' ? (
                <Button variant="outlined" onClick={() => setConfirmAction('lock')}>
                  Lock
                </Button>
              ) : null}
              {canChangeAccountStatus(user) && account.status === 'LOCKED' ? (
                <Button variant="outlined" onClick={() => setConfirmAction('unlock')}>
                  Unlock
                </Button>
              ) : null}
            </Stack>
          ) : null
        }
      />

      {actionError ? <ErrorAlert message={getErrorMessage(actionError)} /> : null}

      <DataState
        isLoading={query.isLoading}
        error={query.error ? getErrorMessage(query.error) : null}
        onRetry={() => void query.refetch()}
      >
        {account ? (
          <Stack spacing={3}>
            <AccountDetailCard account={account} />
            {account.status === 'CLOSED' ? (
              <Alert severity="info">This account is closed. Mutations are disabled.</Alert>
            ) : null}
            <Box>
              <Tabs value={tab} onChange={(_, nextTab) => setTab(nextTab)} sx={{ mb: 2 }}>
                <Tab label="Ledger" />
                <Tab label="Transfers" />
              </Tabs>
              {tab === 0 ? <AccountLedgerTab accountId={account.id} /> : null}
              {tab === 1 ? <AccountTransfersTab accountId={account.id} /> : null}
            </Box>
          </Stack>
        ) : null}
      </DataState>

      <TopupDialog
        open={topupOpen}
        isPending={topupMutation.isPending}
        onClose={() => setTopupOpen(false)}
        onSubmit={submitTopup}
      />
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction === 'lock' ? 'Lock account' : 'Unlock account'}
        message={
          confirmAction === 'lock'
            ? 'This will prevent transfers and topups on the account until it is unlocked.'
            : 'This will make the account active again.'
        }
        confirmLabel={confirmAction === 'lock' ? 'Lock' : 'Unlock'}
        isPending={statusActionPending}
        onClose={() => setConfirmAction(null)}
        onConfirm={submitStatusAction}
      />
    </>
  );
}

