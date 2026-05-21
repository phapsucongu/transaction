'use client';

import { Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@/shared/utils/date';
import { formatMinorMoney } from '@/shared/utils/money';
import type { Account } from '../accounts.types';
import { AccountStatusChip } from './AccountStatusChip';

export function AccountDetailCard({ account }: { account: Account }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
          <div>
            <Typography variant="h5">{account.code}</Typography>
            <Typography color="text.secondary">{account.name}</Typography>
          </div>
          <AccountStatusChip status={account.status} />
        </Stack>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Balance
            </Typography>
            <Typography variant="h6">
              {formatMinorMoney(account.available_balance_minor, account.currency)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Currency
            </Typography>
            <Typography>{account.currency}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Version
            </Typography>
            <Typography>{account.version}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Created
            </Typography>
            <Typography>{formatDateTime(account.created_at)}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Updated
            </Typography>
            <Typography>{formatDateTime(account.updated_at)}</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

