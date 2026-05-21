'use client';

import { useState } from 'react';
import { DataState } from '@/shared/components/DataState';
import { getErrorMessage } from '@/shared/api/errors';
import { LedgerTable } from '@/features/ledger/components/LedgerTable';
import { useAccountLedgerQuery } from '../accounts.queries';

export function AccountLedgerTab({ accountId }: { accountId: string }) {
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const query = useAccountLedgerQuery(accountId, { limit, offset });

  return (
    <DataState
      isLoading={query.isLoading}
      error={query.error ? getErrorMessage(query.error) : null}
      isEmpty={query.data?.data.length === 0}
      onRetry={() => void query.refetch()}
    >
      {query.data ? (
        <LedgerTable
          entries={query.data.data}
          meta={query.data.meta}
          onPageChange={(page) => setOffset(page * limit)}
          onRowsPerPageChange={(rowsPerPage) => {
            setLimit(rowsPerPage);
            setOffset(0);
          }}
        />
      ) : null}
    </DataState>
  );
}

