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
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/shared/utils/date';
import { formatMinorMoney } from '@/shared/utils/money';
import type { PaginationMeta } from '@/shared/types/pagination';
import type { Account } from '../accounts.types';
import { AccountStatusChip } from './AccountStatusChip';

interface AccountTableProps {
  accounts: Account[];
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

export function AccountTable({
  accounts,
  meta,
  onPageChange,
  onRowsPerPageChange,
}: AccountTableProps) {
  const router = useRouter();

  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Currency</TableCell>
              <TableCell align="right">Available</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.map((account) => (
              <TableRow
                key={account.id}
                hover
                tabIndex={0}
                onClick={() => router.push(`/accounts/${account.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    router.push(`/accounts/${account.id}`);
                  }
                }}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{account.code}</TableCell>
                <TableCell>{account.name}</TableCell>
                <TableCell>{account.currency}</TableCell>
                <TableCell align="right">
                  {formatMinorMoney(account.available_balance_minor, account.currency)}
                </TableCell>
                <TableCell>
                  <AccountStatusChip status={account.status} />
                </TableCell>
                <TableCell>{formatDateTime(account.created_at)}</TableCell>
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
