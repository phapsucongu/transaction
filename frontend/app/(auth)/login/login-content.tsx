'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLoginMutation, useSessionQuery } from '@/features/auth/auth.hooks';
import { loginSchema, type LoginFormValues } from '@/features/auth/auth.schemas';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { getErrorMessage } from '@/shared/api/errors';

export function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard';
  const sessionQuery = useSessionQuery();
  const loginMutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (sessionQuery.data) {
      router.replace('/dashboard');
    }
  }, [router, sessionQuery.data]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await loginMutation.mutateAsync(values);
      router.replace(returnTo.startsWith('/') ? returnTo : '/dashboard');
    } catch {
      // Rendered through mutation state.
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        <Paper variant="outlined" sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Transaction Simulator
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Sign in to access accounts, transfers, and ledger views.
          </Typography>

          {loginMutation.isError ? (
            <ErrorAlert message={getErrorMessage(loginMutation.error)} />
          ) : null}

          <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={loginMutation.isPending}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              disabled={loginMutation.isPending}
              fullWidth
            />
            <Button type="submit" variant="contained" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

