'use client';

import AddIcon from '@mui/icons-material/Add';
import { Button } from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';
import { useAuthUser } from '@/features/auth/auth.hooks';
import { canCreateTransfer } from '@/features/auth/permissions';
import { TransferTable } from '@/features/transfers/components/TransferTable';
import { useTransfersQuery } from '@/features/transfers/transfers.queries';
import { DataState } from '@/shared/components/DataState';
import { PageHeader } from '@/shared/components/PageHeader';
import { getErrorMessage } from '@/shared/api/errors';

export const dynamic = 'force-dynamic';

export default function TransfersPage() {
  const user = useAuthUser();
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const query = useTransfersQuery({ limit, offset });

  return (
    <>
      <PageHeader
        title="Transfers"
        description="Transfer history from the backend."
        action={
          canCreateTransfer(user) ? (
            <Button component={Link} href="/transfers/new" variant="contained" startIcon={<AddIcon />}>
              New transfer
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
          <TransferTable
            transfers={query.data.data}
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

