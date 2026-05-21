'use client';

import { Alert, Paper } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/features/auth/auth.hooks';
import { canCreateAccount } from '@/features/auth/permissions';
import { AccountForm } from '@/features/accounts/components/AccountForm';
import { useCreateAccountMutation } from '@/features/accounts/accounts.queries';
import type { CreateAccountFormValues } from '@/features/accounts/accounts.schemas';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { PageHeader } from '@/shared/components/PageHeader';
import { getErrorMessage } from '@/shared/api/errors';

export default function NewAccountPage() {
  const router = useRouter();
  const user = useAuthUser();
  const mutation = useCreateAccountMutation();

  if (!canCreateAccount(user)) {
    return <Alert severity="warning">Only ADMIN users can create accounts.</Alert>;
  }

  const handleSubmit = async (values: CreateAccountFormValues) => {
    try {
      const account = await mutation.mutateAsync(values);
      router.push(`/accounts/${account.id}`);
    } catch {
      // Rendered through mutation state.
    }
  };

  return (
    <>
      <PageHeader title="New account" description="Create a simulated account." />
      {mutation.isError ? <ErrorAlert message={getErrorMessage(mutation.error)} /> : null}
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 560 }}>
        <AccountForm isPending={mutation.isPending} onSubmit={handleSubmit} />
      </Paper>
    </>
  );
}

