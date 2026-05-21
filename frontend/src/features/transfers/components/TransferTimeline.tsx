'use client';

import { List, ListItem, ListItemText, Paper } from '@mui/material';
import type { Transfer } from '../transfers.types';

export function TransferTimeline({ transfer }: { transfer: Transfer }) {
  const events = [
    { label: 'Created', value: transfer.created_at },
    { label: `Status: ${transfer.status}`, value: transfer.updated_at },
  ].filter((event) => !!event.value);

  return (
    <Paper variant="outlined">
      <List dense>
        {events.map((event) => (
          <ListItem key={`${event.label}-${event.value}`}>
            <ListItemText primary={event.label} secondary={event.value} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}

