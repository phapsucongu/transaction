'use client';

import { Alert, Paper } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/features/auth/auth.hooks';
import { canCreateTransfer } from '@/features/auth/permissions';
import { useAccountsQuery } from '@/features/accounts/accounts.queries';
import { TransferForm } from '@/features/transfers/components/TransferForm';
import { useCreateTransferMutation } from '@/features/transfers/transfers.queries';
import type { CreateTransferFormValues } from '@/features/transfers/transfers.schemas';
import { DataState } from '@/shared/components/DataState';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { PageHeader } from '@/shared/components/PageHeader';
import { getErrorMessage } from '@/shared/api/errors';

export default function NewTransferPage() {
  const router = useRouter();
  const user = useAuthUser();
  const accountsQuery = useAccountsQuery({ limit: 100, offset: 0 });
  const mutation = useCreateTransferMutation();

  if (!canCreateTransfer(user)) {
    return <Alert severity="warning">Your role cannot create transfers.</Alert>;
  }

  const handleSubmit = async (values: CreateTransferFormValues) => {
    try {
      const transfer = await mutation.mutateAsync(values);
      router.push(`/transfers/${transfer.id}`);
    } catch {
      // Rendered through mutation state.
    }
  };

  return (
    <>
      <PageHeader title="New transfer" description="Create a ledger transfer with idempotency." />
      {mutation.isError ? <ErrorAlert message={getErrorMessage(mutation.error)} /> : null}
      <DataState
        isLoading={accountsQuery.isLoading}
        error={accountsQuery.error ? getErrorMessage(accountsQuery.error) : null}
        isEmpty={accountsQuery.data?.data.length === 0}
        onRetry={() => void accountsQuery.refetch()}
      >
        {accountsQuery.data ? (
          <Paper variant="outlined" sx={{ p: 3, maxWidth: 640 }}>
            <TransferForm
              accounts={accountsQuery.data.data}
              isPending={mutation.isPending}
              onSubmit={handleSubmit}
            />
          </Paper>
        ) : null}
      </DataState>
    </>
  );
}

