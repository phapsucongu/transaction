'use client';

import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/shared/utils/date';
import { formatMinorMoney } from '@/shared/utils/money';
import type { PaginationMeta } from '@/shared/types/pagination';
import type { Transfer } from '../transfers.types';
import { TransferStatusChip } from './TransferStatusChip';

interface TransferTableProps {
  transfers: Transfer[];
  meta: PaginationMeta;
  accountContextId?: string;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

export function TransferTable({
  transfers,
  meta,
  accountContextId,
  onPageChange,
  onRowsPerPageChange,
}: TransferTableProps) {
  const router = useRouter();

  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              {accountContextId ? <TableCell>Direction</TableCell> : null}
              <TableCell>Source</TableCell>
              <TableCell>Destination</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transfers.map((transfer) => {
              const direction =
                accountContextId === transfer.source_account_id
                  ? 'OUT'
                  : accountContextId === transfer.destination_account_id
                    ? 'IN'
                    : null;

              return (
                <TableRow
                  key={transfer.id}
                  hover
                  tabIndex={0}
                  onClick={() => router.push(`/transfers/${transfer.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(`/transfers/${transfer.id}`);
                    }
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{transfer.id.slice(0, 8)}</TableCell>
                  {accountContextId ? (
                    <TableCell>
                      {direction ? <Chip size="small" label={direction} /> : '-'}
                    </TableCell>
                  ) : null}
                  <TableCell>{transfer.source_account_id.slice(0, 8)}</TableCell>
                  <TableCell>{transfer.destination_account_id.slice(0, 8)}</TableCell>
                  <TableCell align="right">
                    {formatMinorMoney(transfer.amount_minor, transfer.currency)}
                  </TableCell>
                  <TableCell>
                    <TransferStatusChip status={transfer.status} />
                  </TableCell>
                  <TableCell>{formatDateTime(transfer.created_at)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={meta.total}
        page={Math.floor(meta.offset / meta.limit)}
        rowsPerPage={meta.limit}
        onPageChange={(_, page) => onPageChange(page)}
        onRowsPerPageChange={(event) => onRowsPerPageChange(Number(event.target.value))}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Paper>
  );
}
