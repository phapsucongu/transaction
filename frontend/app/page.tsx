'use client';

import { Box, CircularProgress } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSessionQuery } from '@/features/auth/auth.hooks';

export default function HomePage() {
  const router = useRouter();
  const sessionQuery = useSessionQuery();

  useEffect(() => {
    if (sessionQuery.isLoading) {
      return;
    }

    router.replace(sessionQuery.data ? '/dashboard' : '/login');
  }, [router, sessionQuery.data, sessionQuery.isLoading]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

