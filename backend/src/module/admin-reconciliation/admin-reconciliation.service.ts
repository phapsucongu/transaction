import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../../db/db.service';

@Injectable()
export class AdminReconciliationService {
    constructor(private readonly dbService: DbService) { }

    async checkAllAccounts() {
        const totalRes = await this.dbService.query(`
      SELECT COUNT(*)::int AS total
      FROM accounts
    `);

        const mismatchRes = await this.dbService.query(`
      WITH ledger_balance AS (
        SELECT
          account_id,
          SUM(
            CASE
              WHEN side = 'CREDIT' THEN amount_minor::numeric
              WHEN side = 'DEBIT' THEN -amount_minor::numeric
              ELSE 0
            END
          ) AS ledger_balance_minor,
          COUNT(*)::int AS ledger_entries_count
        FROM ledger_entries
        GROUP BY account_id
      )
      SELECT
        a.id AS account_id,
        a.owner_user_id,
        a.currency,
        a.status,
        a.available_balance_minor::numeric AS account_balance_minor,
        COALESCE(lb.ledger_balance_minor, 0) AS ledger_balance_minor,
        (
          a.available_balance_minor::numeric
          - COALESCE(lb.ledger_balance_minor, 0)
        ) AS difference_minor,
        COALESCE(lb.ledger_entries_count, 0) AS ledger_entries_count
      FROM accounts a
      LEFT JOIN ledger_balance lb
        ON lb.account_id = a.id
      WHERE
        a.available_balance_minor::numeric
        <> COALESCE(lb.ledger_balance_minor, 0)
      ORDER BY
        ABS(
          a.available_balance_minor::numeric
          - COALESCE(lb.ledger_balance_minor, 0)
        ) DESC,
        a.id ASC
    `);

        return {
            ok: mismatchRes.rowCount === 0,
            checked_at: new Date().toISOString(),
            total_accounts: totalRes.rows[0].total,
            mismatch_count: mismatchRes.rowCount,
            mismatches: mismatchRes.rows,
        };
    }

    async checkOneAccount(accountId: string) {
        const res = await this.dbService.query(
            `
      WITH ledger_balance AS (
        SELECT
          account_id,
          SUM(
            CASE
              WHEN side = 'CREDIT' THEN amount_minor::numeric
              WHEN side = 'DEBIT' THEN -amount_minor::numeric
              ELSE 0
            END
          ) AS ledger_balance_minor,
          COUNT(*)::int AS ledger_entries_count
        FROM ledger_entries
        WHERE account_id = $1
        GROUP BY account_id
      )
      SELECT
        a.id AS account_id,
        a.owner_user_id,
        a.currency,
        a.status,
        a.available_balance_minor::numeric AS account_balance_minor,
        COALESCE(lb.ledger_balance_minor, 0) AS ledger_balance_minor,
        (
          a.available_balance_minor::numeric
          - COALESCE(lb.ledger_balance_minor, 0)
        ) AS difference_minor,
        COALESCE(lb.ledger_entries_count, 0) AS ledger_entries_count
      FROM accounts a
      LEFT JOIN ledger_balance lb
        ON lb.account_id = a.id
      WHERE a.id = $1
      `,
            [accountId],
        );

        if (res.rowCount === 0) {
            throw new NotFoundException('Account not found.');
        }

        const row = res.rows[0];

        return {
            ok: Number(row.difference_minor) === 0,
            checked_at: new Date().toISOString(),
            account: row,
        };
    }
}