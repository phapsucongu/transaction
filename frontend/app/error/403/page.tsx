/**
 * 403 Forbidden page
 */

'use client';

import { Box, Typography, Button } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
      }}
    >
      <Typography variant="h1" sx={{ mb: 2 }}>
        403
      </Typography>
      <Typography variant="h5" sx={{ mb: 3 }}>
        You don&apos;t have permission to access this resource.
      </Typography>
      <Button
        variant="contained"
        onClick={() => router.push('/dashboard')}
      >
        Go to Dashboard
      </Button>
    </Box>
  );
}
