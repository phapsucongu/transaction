'use client';

import { Box, Stack, Typography } from '@mui/material';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
      sx={{ mb: 3 }}
    >
      <Box>
        <Typography variant="h4" component="h1" gutterBottom={!!description}>
          {title}
        </Typography>
        {description ? <Typography color="text.secondary">{description}</Typography> : null}
      </Box>
      {action}
    </Stack>
  );
}

