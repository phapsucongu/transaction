'use client';

import { Box, Button, Typography } from '@mui/material';
import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3,
      }}
    >
      <Typography variant="h1">403</Typography>
      <Typography variant="h5" textAlign="center">
        You do not have permission to access this page.
      </Typography>
      <Button component={Link} href="/dashboard" variant="contained">
        Go to dashboard
      </Button>
    </Box>
  );
}

