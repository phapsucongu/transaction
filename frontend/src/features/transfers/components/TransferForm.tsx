'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import type { Account } from '@/features/accounts/accounts.types';
import { formatMinorMoney } from '@/shared/utils/money';
import { createTransferSchema, type CreateTransferFormValues } from '../transfers.schemas';

interface TransferFormProps {
  accounts: Account[];
  isPending?: boolean;
  onSubmit: (values: CreateTransferFormValues) => void;
}

export function TransferForm({ accounts, isPending = false, onSubmit }: TransferFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTransferFormValues>({
    resolver: zodResolver(createTransferSchema),
    defaultValues: {
      source_account_id: '',
      destination_account_id: '',
      amount_minor: 1,
      currency: 'VND',
    },
  });

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="source_account_id"
        control={control}
        render={({ field }) => (
          <TextField
            select
            label="Source account"
            {...field}
            error={!!errors.source_account_id}
            helperText={errors.source_account_id?.message}
            disabled={isPending}
            fullWidth
          >
            <MenuItem value="" disabled>
              Select source account
            </MenuItem>
            {accounts.map((account) => (
              <MenuItem key={account.id} value={account.id}>
                {account.code} · {formatMinorMoney(account.available_balance_minor, account.currency)}
              </MenuItem>
            ))}
          </TextField>
        )}
      />

      <Controller
        name="destination_account_id"
        control={control}
        render={({ field }) => (
          <TextField
            select
            label="Destination account"
            {...field}
            error={!!errors.destination_account_id}
            helperText={errors.destination_account_id?.message}
            disabled={isPending}
            fullWidth
          >
            <MenuItem value="" disabled>
              Select destination account
            </MenuItem>
            {accounts.map((account) => (
              <MenuItem key={account.id} value={account.id}>
                {account.code} · {account.currency}
              </MenuItem>
            ))}
          </TextField>
        )}
      />

      <TextField
        label="Amount (minor unit)"
        type="number"
        inputProps={{ min: 1, step: 1 }}
        {...register('amount_minor')}
        error={!!errors.amount_minor}
        helperText={errors.amount_minor?.message}
        disabled={isPending}
        fullWidth
      />

      <TextField
        label="Currency"
        inputProps={{ maxLength: 3 }}
        {...register('currency')}
        error={!!errors.currency}
        helperText={errors.currency?.message}
        disabled={isPending}
        fullWidth
      />

      <Button type="submit" variant="contained" disabled={isPending || accounts.length < 2}>
        {isPending ? 'Creating...' : 'Create transfer'}
      </Button>
    </Stack>
  );
}
