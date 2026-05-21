'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { topupSchema, type TopupFormValues } from '../accounts.schemas';

interface TopupDialogProps {
  open: boolean;
  isPending?: boolean;
  onClose: () => void;
  onSubmit: (values: TopupFormValues) => void;
}

export function TopupDialog({ open, isPending = false, onClose, onSubmit }: TopupDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TopupFormValues>({
    resolver: zodResolver(topupSchema),
    defaultValues: {
      amount_minor: 1,
    },
  });

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={isPending ? undefined : close} maxWidth="xs" fullWidth>
      <DialogTitle>Top up account</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? 'Submitting...' : 'Top up'}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}

