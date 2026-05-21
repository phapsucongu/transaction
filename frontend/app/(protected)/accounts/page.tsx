'use client';

import AddIcon from '@mui/icons-material/Add';
import { Button } from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';
import { useAuthUser } from '@/features/auth/auth.hooks';
import { canCreateAccount } from '@/features/auth/permissions';
import { AccountTable } from '@/features/accounts/components/AccountTable';
import { useAccountsQuery } from '@/features/accounts/accounts.queries';
import { DataState } from '@/shared/components/DataState';
import { PageHeader } from '@/shared/components/PageHeader';
import { getErrorMessage } from '@/shared/api/errors';

export const dynamic = 'force-dynamic';

export default function AccountsPage() {
  const user = useAuthUser();
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const query = useAccountsQuery({ limit, offset });

  return (
    <>
      <PageHeader
        title="Accounts"
        description="List simulated ledger accounts from the backend."
        action={
          canCreateAccount(user) ? (
            <Button component={Link} href="/accounts/new" variant="contained" startIcon={<AddIcon />}>
              New account
            </Button>
          ) : null
        }
      />
      <DataState
        isLoading={query.isLoading}
        error={query.error ? getErrorMessage(query.error) : null}
        isEmpty={query.data?.data.length === 0}
        onRetry={() => void query.refetch()}
      >
        {query.data ? (
          <AccountTable
            accounts={query.data.data}
            meta={query.data.meta}
            onPageChange={(page) => setOffset(page * limit)}
            onRowsPerPageChange={(rowsPerPage) => {
              setLimit(rowsPerPage);
              setOffset(0);
            }}
          />
        ) : null}
      </DataState>
    </>
  );
}

