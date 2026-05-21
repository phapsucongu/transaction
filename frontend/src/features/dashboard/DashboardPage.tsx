'use client';

import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddIcon from '@mui/icons-material/Add';
import PaymentsIcon from '@mui/icons-material/Payments';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Button, Card, CardActions, CardContent, Grid, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { useAuthUser } from '@/features/auth/auth.hooks';
import { canCreateAccount, canCreateTransfer } from '@/features/auth/permissions';
import { DataState } from '@/shared/components/DataState';
import { PageHeader } from '@/shared/components/PageHeader';
import { getErrorMessage } from '@/shared/api/errors';
import { useAccountsQuery } from '@/features/accounts/accounts.queries';
import { useTransfersQuery } from '@/features/transfers/transfers.queries';

export function DashboardPage() {
  const user = useAuthUser();
  const accountsQuery = useAccountsQuery({ limit: 5, offset: 0 });
  const transfersQuery = useTransfersQuery({ limit: 5, offset: 0 });

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Dashboard"
        description={`Signed in as ${user?.full_name ?? user?.email ?? 'user'}`}
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <AccountBalanceIcon color="primary" />
              <Typography variant="h6" sx={{ mt: 1 }}>
                Accounts
              </Typography>
              <DataState
                isLoading={accountsQuery.isLoading}
                error={accountsQuery.error ? getErrorMessage(accountsQuery.error) : null}
              >
                <Typography variant="h4">{accountsQuery.data?.meta.total ?? 0}</Typography>
              </DataState>
            </CardContent>
            <CardActions>
              <Button component={Link} href="/accounts">
                View accounts
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <SwapHorizIcon color="primary" />
              <Typography variant="h6" sx={{ mt: 1 }}>
                Transfers
              </Typography>
              <DataState
                isLoading={transfersQuery.isLoading}
                error={transfersQuery.error ? getErrorMessage(transfersQuery.error) : null}
              >
                <Typography variant="h4">{transfersQuery.data?.meta.total ?? 0}</Typography>
              </DataState>
            </CardContent>
            <CardActions>
              <Button component={Link} href="/transfers">
                View transfers
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <PaymentsIcon color="primary" />
              <Typography variant="h6" sx={{ mt: 1 }}>
                Quick actions
              </Typography>
              <Typography color="text.secondary">Common demo workflows.</Typography>
            </CardContent>
            <CardActions sx={{ flexWrap: 'wrap', gap: 1 }}>
              {canCreateTransfer(user) ? (
                <Button component={Link} href="/transfers/new" startIcon={<PaymentsIcon />}>
                  New transfer
                </Button>
              ) : null}
              {canCreateAccount(user) ? (
                <Button component={Link} href="/accounts/new" startIcon={<AddIcon />}>
                  New account
                </Button>
              ) : null}
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

