'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Stack, TextField } from '@mui/material';
import { useForm } from 'react-hook-form';
import { createAccountSchema, type CreateAccountFormValues } from '../accounts.schemas';

interface AccountFormProps {
  isPending?: boolean;
  onSubmit: (values: CreateAccountFormValues) => void;
}

export function AccountForm({ isPending = false, onSubmit }: AccountFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAccountFormValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      code: '',
      name: '',
      currency: 'VND',
    },
  });

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
      <TextField
        label="Code"
        {...register('code')}
        error={!!errors.code}
        helperText={errors.code?.message}
        disabled={isPending}
        fullWidth
      />
      <TextField
        label="Name"
        {...register('name')}
        error={!!errors.name}
        helperText={errors.name?.message}
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
      <Button type="submit" variant="contained" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create account'}
      </Button>
    </Stack>
  );
}

