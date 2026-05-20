import { ForbiddenException, Injectable , BadRequestException, NotFoundException} from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { DbService } from "../../db/db.service";
import { CreateTransferDto } from "./dto/create_transfers.dto";
import type { AuthUser } from "../../common/types/auth-user";


@Injectable()
export class TransfersService {
    constructor(private readonly db: DbService) {}

    async getAll(user: AuthUser, limit: number, offset: number) {
        if (user.role === 'ADMIN') {
            const result = await this.db.query(
                `SELECT *
                FROM transfers
                ORDER BY created_at DESC
                LIMIT $1
                OFFSET $2`,
                [limit, offset],
            );
            const totalResult = await this.db.query(
                `SELECT COUNT(*)::int AS total
                FROM transfers`,
            );

            return { rows: result.rows, total: Number(totalResult.rows[0]?.total ?? 0) };
        }

        const result = await this.db.query(
            `SELECT t.*
            FROM transfers t
            WHERE t.source_account_id IN (
                SELECT id FROM accounts WHERE owner_user_id = $1
            )
            OR t.destination_account_id IN (
                SELECT id FROM accounts WHERE owner_user_id = $1
            )
            ORDER BY t.created_at DESC
            LIMIT $2
            OFFSET $3`,
            [user.id, limit, offset],
        );
        const totalResult = await this.db.query(
            `SELECT COUNT(*)::int AS total
            FROM transfers t
            WHERE t.source_account_id IN (
                SELECT id FROM accounts WHERE owner_user_id = $1
            )
            OR t.destination_account_id IN (
                SELECT id FROM accounts WHERE owner_user_id = $1
            )`,
            [user.id],
        );

        return { rows: result.rows, total: Number(totalResult.rows[0]?.total ?? 0) };
    }

    async findOne(user: AuthUser, id: string) {
        if (user.role === 'ADMIN') {
            const result = await this.db.query(
                `SELECT *
                FROM transfers
                WHERE id = $1`,
                [id],
            );

            const transfer = result.rows[0];
            if (!transfer) {
                throw new NotFoundException('transfer not found');
            }
            return transfer;
        }

        const result = await this.db.query(
            `SELECT t.*
            FROM transfers t
            WHERE t.id = $1
            AND (
                t.source_account_id IN (
                    SELECT id FROM accounts WHERE owner_user_id = $2
                )
                OR t.destination_account_id IN (
                    SELECT id FROM accounts WHERE owner_user_id = $2
                )
            )`,
            [id, user.id],
        );

        const transfer = result.rows[0];
        if (!transfer) {
            throw new NotFoundException('transfer not found');
        }
        return transfer;
    }

    async create(
        user: AuthUser,
        dto: CreateTransferDto
    ) {
        const client = await this.db.Transaction(async (client) => {
            
            if (dto.destination_account_id === dto.source_account_id) {
                throw new BadRequestException('Source and destination accounts must be different.');
            }

            const [firstId, secondId] = [dto.source_account_id, dto.destination_account_id].sort();

            const firstAccount = await client.query(
                `SELECT * FROM accounts WHERE id = $1 FOR UPDATE`,
                [firstId],
            ).then(res => res.rows[0]);

            if( !firstAccount) {
                throw new NotFoundException(`Account with id ${firstId} not found.`);
            }
            
            const secondAccount = await client.query(
                `SELECT * FROM accounts WHERE id = $1 FOR UPDATE`,
                [secondId],
            ).then(res => res.rows[0]);
            
            if( !secondAccount) {
                throw new NotFoundException(`Account with id ${secondId} not found.`);
            }

            if (firstAccount.currency !== dto.currency || secondAccount.currency !== dto.currency) {
                throw new BadRequestException('Currency mismatch with account.');
            }

            if (firstAccount.status !== 'ACTIVE' || secondAccount.status !== 'ACTIVE') {
                throw new BadRequestException('One or both accounts are locked.');
            }

            const sourceAccount = firstAccount.id === dto.source_account_id ? firstAccount : secondAccount;
            //const destinationAccount = firstAccount.id === dto.destination_account_id ? firstAccount : secondAccount;

            if (user.role !== 'ADMIN' && sourceAccount.owner_user_id !== user.id) {
                throw new ForbiddenException('Source account not owned by user.');
            }
            
            sourceAccount.available_balance_minor = Number(sourceAccount.available_balance_minor);
            // console.log(sourceAccount.available_balance_minor, dto.amount_minor);
            if (sourceAccount.available_balance_minor < dto.amount_minor) {
                throw new BadRequestException('Insufficient funds in source account.');
            }

            await client.query(
                `
                UPDATE accounts
                SET available_balance_minor = available_balance_minor - $1, updated_at = NOW(), version = version + 1
                WHERE id = $2
                RETURNING *`,
                [dto.amount_minor, dto.source_account_id],
            );

            await client.query(
                `
                UPDATE accounts
                SET available_balance_minor = available_balance_minor + $1, updated_at = NOW(), version = version + 1
                WHERE id = $2
                RETURNING *`,
                [dto.amount_minor, dto.destination_account_id],
             );

            const requestHash = createHash('sha256')
                .update(
                    JSON.stringify({
                    source_account_id: dto.source_account_id,
                    destination_account_id: dto.destination_account_id,
                    amount_minor: dto.amount_minor,
                    currency: dto.currency,
                    }),
                )
                .digest('hex');

                const transfer = await client.query(
                `
                INSERT INTO transfers (
                    client_id,
                    idem_key,
                    request_hash,
                    source_account_id,
                    destination_account_id,
                    amount_minor,
                    currency,
                    status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUCCESS')
                RETURNING *
                `,
                [
                    'demo-client',
                    randomUUID(),
                    requestHash,
                    dto.source_account_id,
                    dto.destination_account_id,
                    dto.amount_minor,
                    dto.currency,
                ],
            );

            await client.query(
                `INSERT INTO ledger_entries (transfer_id, account_id, entry_type, side, amount_minor, currency) VALUES ($1, $2, 'TRANSFER', 'DEBIT', $3, $4)`,
                [transfer.rows[0].id, dto.source_account_id, dto.amount_minor, dto.currency],
            );

            await client.query(
                `INSERT INTO ledger_entries (transfer_id, account_id, entry_type, side, amount_minor, currency) VALUES ($1, $2, 'TRANSFER', 'CREDIT', $3, $4)`,
                [transfer.rows[0].id, dto.destination_account_id, dto.amount_minor, dto.currency],
            );
            return transfer.rows[0];
        });

        return client;
    }

}