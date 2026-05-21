'use client';

import { Alert, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { formatDateTime } from '@/shared/utils/date';
import { formatMinorMoney } from '@/shared/utils/money';
import type { Transfer } from '../transfers.types';
import { TransferStatusChip } from './TransferStatusChip';

export function TransferDetailCard({ transfer }: { transfer: Transfer }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
          <div>
            <Typography variant="h5">Transfer {transfer.id.slice(0, 8)}</Typography>
            <Typography color="text.secondary">{transfer.id}</Typography>
          </div>
          <TransferStatusChip status={transfer.status} />
        </Stack>

        {transfer.failure_message ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {transfer.failure_code ? `${transfer.failure_code}: ` : null}
            {transfer.failure_message}
          </Alert>
        ) : null}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Source
            </Typography>
            <Typography>
              <Link href={`/accounts/${transfer.source_account_id}`}>
                {transfer.source_account_id}
              </Link>
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Destination
            </Typography>
            <Typography>
              <Link href={`/accounts/${transfer.destination_account_id}`}>
                {transfer.destination_account_id}
              </Link>
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Amount
            </Typography>
            <Typography variant="h6">
              {formatMinorMoney(transfer.amount_minor, transfer.currency)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Created
            </Typography>
            <Typography>{formatDateTime(transfer.created_at)}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Updated
            </Typography>
            <Typography>{formatDateTime(transfer.updated_at)}</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

