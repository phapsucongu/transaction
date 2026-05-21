'use client';

import RefreshIcon from '@mui/icons-material/Refresh';
import { Button, Stack, Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import { TransferDetailCard } from '@/features/transfers/components/TransferDetailCard';
import { TransferTimeline } from '@/features/transfers/components/TransferTimeline';
import { useTransferQuery } from '@/features/transfers/transfers.queries';
import { DataState } from '@/shared/components/DataState';
import { PageHeader } from '@/shared/components/PageHeader';
import { getErrorMessage } from '@/shared/api/errors';

export default function TransferDetailPage() {
  const params = useParams<{ transferId: string }>();
  const transferId = params.transferId;
  const query = useTransferQuery(transferId);

  return (
    <>
      <PageHeader
        title="Transfer detail"
        action={
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            Refresh
          </Button>
        }
      />
      <DataState
        isLoading={query.isLoading}
        error={query.error ? getErrorMessage(query.error) : null}
        onRetry={() => void query.refetch()}
      >
        {query.data ? (
          <Stack spacing={3}>
            <TransferDetailCard transfer={query.data} />
            <div>
              <Typography variant="h6" gutterBottom>
                Timeline
              </Typography>
              <TransferTimeline transfer={query.data} />
            </div>
          </Stack>
        ) : null}
      </DataState>
    </>
  );
}

