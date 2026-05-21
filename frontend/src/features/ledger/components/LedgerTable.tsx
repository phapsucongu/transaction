'use client';

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material';
import Link from 'next/link';
import { StatusChip } from '@/shared/components/StatusChip';
import { formatDateTime } from '@/shared/utils/date';
import { formatMinorMoney } from '@/shared/utils/money';
import type { PaginationMeta } from '@/shared/types/pagination';
import type { LedgerEntry } from '../ledger.types';

interface LedgerTableProps {
  entries: LedgerEntry[];
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

export function LedgerTable({
  entries,
  meta,
  onPageChange,
  onRowsPerPageChange,
}: LedgerTableProps) {
  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Created</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Side</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Transfer</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                <TableCell>{entry.entry_type}</TableCell>
                <TableCell>
                  <StatusChip value={entry.side} />
                </TableCell>
                <TableCell align="right">
                  {formatMinorMoney(entry.amount_minor, entry.currency)}
                </TableCell>
                <TableCell>
                  {entry.transfer_id ? (
                    <Link href={`/transfers/${entry.transfer_id}`}>{entry.transfer_id.slice(0, 8)}</Link>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
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

