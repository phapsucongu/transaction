'use client';

import { Box, CircularProgress } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSessionQuery } from '@/features/auth/auth.hooks';
import { AppShell } from '@/shared/layouts/AppShell';

export default function ProtectedLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sessionQuery = useSessionQuery();

  useEffect(() => {
    if (!sessionQuery.isLoading && !sessionQuery.data) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, sessionQuery.data, sessionQuery.isLoading]);

  if (sessionQuery.isLoading || !sessionQuery.data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <AppShell>{children}</AppShell>;
}

