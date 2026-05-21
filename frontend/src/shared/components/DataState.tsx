'use client';

import { Box, CircularProgress } from '@mui/material';
import { ErrorAlert } from './ErrorAlert';
import { EmptyState } from './EmptyState';

interface DataStateProps {
  isLoading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function DataState({ isLoading, error, isEmpty, onRetry, children }: DataStateProps) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={onRetry} />;
  }

  if (isEmpty) {
    return <EmptyState />;
  }

  return <>{children}</>;
}

