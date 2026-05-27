import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DbService } from "../../db/db.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import type { AuthUser } from "../../common/types/auth-user";

@Injectable()
export class AccountsService {
    constructor(private readonly dbService: DbService) {}

    async create(user: AuthUser, dto: CreateAccountDto) {
        try {
            const result = await this.dbService.query(
                `INSERT INTO accounts (code, name, currency, owner_user_id) VALUES ($1, $2, $3, $4) RETURNING 
                id,
                code,
                name,
                currency,
                available_balance_minor,
                status,
                version,
                created_at,
                updated_at`,
                [dto.code, dto.name, dto.currency, user.id],
            );
            return result.rows[0];
        } catch (error: any) {
            if (error?.code === '23505') {
                throw new BadRequestException(`Account with code ${dto.code} already exists.`);
            }
            throw new InternalServerErrorException('Failed to create account.');
        }
    }

    async getAll(user: AuthUser, limit: number, offset: number) {
        if (user.role === 'ADMIN') {
            const result = await this.dbService.query(
                `SELECT 
                    id,
                    code,
                    name,
                    currency,
                    available_balance_minor,
                    status,
                    version,
                    created_at,
                    updated_at
                FROM accounts
                ORDER BY created_at DESC
                LIMIT $1
                OFFSET $2`,
                [limit, offset],
            );

            const totalResult = await this.dbService.query(
                `SELECT COUNT(*)::int AS total
                FROM accounts`,
            );

            return { rows: result.rows, total: Number(totalResult.rows[0]?.total ?? 0) };
        }

        const result = await this.dbService.query(
            `SELECT 
                id,
                code,
                name,
                currency,
                available_balance_minor,
                status,
                version,
                created_at,
                updated_at
            FROM accounts
            WHERE owner_user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            OFFSET $3`,
            [user.id, limit, offset],
        );

        const totalResult = await this.dbService.query(
            `SELECT COUNT(*)::int AS total
            FROM accounts
            WHERE owner_user_id = $1`,
            [user.id],
        );

        return { rows: result.rows, total: Number(totalResult.rows[0]?.total ?? 0) };
    }

    async findOne(user: AuthUser, id: string) {
        if (user.role === 'ADMIN') {
            const result = await this.dbService.query(
                `
                SELECT
                    id,
                    code,
                    name,
                    currency,
                    available_balance_minor,
                    status,
                    version,
                    created_at,
                    updated_at
                FROM accounts
                WHERE id = $1
                `,
                [id],
            );

            const account = result.rows[0];

            if (!account) {
                throw new NotFoundException('account not found');
            }
            return account;
        }

        const result = await this.dbService.query(
            `
            SELECT
                id,
                code,
                name,
                currency,
                available_balance_minor,
                status,
                version,
                created_at,
                updated_at
            FROM accounts
            WHERE id = $1 AND owner_user_id = $2
            `,
            [id, user.id],
        );

    const account = result.rows[0];

    if (!account) {
      throw new NotFoundException('account not found');
    }
        return account;
    }

    async getTransfers(user: AuthUser, id: string, limit: number, offset: number) {
        await this.findOne(user, id);
        const result = await this.dbService.query(
            `SELECT *
            FROM transfers
            WHERE source_account_id = $1 OR destination_account_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            OFFSET $3`,
            [id, limit, offset],
        );
        const totalResult = await this.dbService.query(
            `SELECT COUNT(*)::int AS total
            FROM transfers
            WHERE source_account_id = $1 OR destination_account_id = $1`,
            [id],
        );

        return { rows: result.rows, total: Number(totalResult.rows[0]?.total ?? 0) };
    }

    async getLedger(user: AuthUser, id: string, limit: number, offset: number) {
        await this.findOne(user, id);
        const result = await this.dbService.query(
            `SELECT *
            FROM ledger_entries
            WHERE account_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            OFFSET $3`,
            [id, limit, offset],
        );
        const totalResult = await this.dbService.query(
            `SELECT COUNT(*)::int AS total
            FROM ledger_entries
            WHERE account_id = $1`,
            [id],
        );

        return { rows: result.rows, total: Number(totalResult.rows[0]?.total ?? 0) };
    }

    topUp(id: string, amount_minor: number) {
        return this.dbService.Transaction(async (client) => {
            const result = await client.query(
                `SELECT *
                FROM accounts
                WHERE id = $1
                FOR UPDATE`,
                [id],
            );

            const account = result.rows[0];
            if (!account) {
                throw new NotFoundException('account not found');
            }

            if(account.status !== 'ACTIVE') {
                throw new BadRequestException('account is locked');
            }

            const updateResult = await client.query(
                `UPDATE accounts
                SET available_balance_minor = available_balance_minor + $1, updated_at = NOW(), 
                version = version + 1
                WHERE id = $2
                RETURNING *`,
                [amount_minor, id],
            );

            await client.query(
                `INSERT INTO ledger_entries (
                account_id,
                entry_type,
                side,
                amount_minor,
                currency)
                VALUES ($1,'TOPUP','CREDIT',$2,$3)`,
                [id, amount_minor, account.currency],
            );
            return updateResult.rows[0];
        });
    }

    async lock(id: string) {
        const result = await this.dbService.query(
            `
            UPDATE accounts
            SET 
                status = 'LOCKED',
                updated_at = NOW(),
                version = version + 1
            WHERE id = $1
            RETURNING *
            `,
            [id],
        );

        const account = result.rows[0];
        if (!account) {
            throw new NotFoundException('account not found');
        }
        return account;
    }

    async unlock(id: string) {
        const result = await this.dbService.query(
            `
            UPDATE accounts
            SET 
                status = 'ACTIVE',
                updated_at = NOW(),
                version = version + 1
            WHERE id = $1
            RETURNING *
            `,
            [id],
        );

        const account = result.rows[0];
        if (!account) {
            throw new NotFoundException('account not found');
        }
        return account;
    }
}