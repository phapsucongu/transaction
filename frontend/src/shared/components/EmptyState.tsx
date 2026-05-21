'use client';

import { Box, Typography } from '@mui/material';

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export function EmptyState({
  title = 'No data',
  message = 'There are no records to display.',
}: EmptyStateProps) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
}

