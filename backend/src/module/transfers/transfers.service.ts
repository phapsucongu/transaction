import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    InternalServerErrorException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { createHash } from "crypto";
import { DbService } from "../../db/db.service";
import { CreateTransferDto } from "./dto/create_transfers.dto";
import type { AuthUser } from "../../common/types/auth-user";
import { OutboxService } from "../outbox/outbox.service";

function normalizeResponseBody<T extends Record<string, unknown>>(transfer: T) {
    const responseBody = transfer.response_body;

    if (!responseBody) {
        return transfer;
    }

    if (typeof responseBody === 'string') {
        try {
            return JSON.parse(responseBody);
        } catch {
            throw new InternalServerErrorException('Invalid transfer response body.');
        }
    }

    return responseBody;
}


@Injectable()
export class TransfersService {
    constructor(
        private readonly db: DbService,
        private readonly outbox: OutboxService
    ) { }

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
        dto: CreateTransferDto,
        idemKey: string,
    ) {
        const res = await this.db.Transaction(async (client) => {

            if (dto.destination_account_id === dto.source_account_id) {
                throw new BadRequestException('Source and destination accounts must be different.');
            }

            const [firstId, secondId] = [dto.source_account_id, dto.destination_account_id].sort();


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

            const insertTransferRes = await client.query(
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
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'PROCESSING')
                    ON CONFLICT (client_id, idem_key) DO NOTHING
                    RETURNING *
                    `,
                [
                    user.id,
                    idemKey,
                    requestHash,
                    dto.source_account_id,
                    dto.destination_account_id,
                    dto.amount_minor,
                    dto.currency,
                ],
            );

            let transferRecord;

            if (insertTransferRes.rowCount === 0) {
                const existingRes = await client.query(
                    `
                        SELECT *
                        FROM transfers
                        WHERE client_id = $1
                          AND idem_key = $2
                        FOR UPDATE
                        `,
                    [user.id, idemKey],
                );

                const existingTransfer = existingRes.rows[0];

                if (!existingTransfer) {
                    throw new BadRequestException('Idempotency record not found.');
                }

                if (existingTransfer.request_hash !== requestHash) {
                    throw new ConflictException(
                        'Idempotency-Key was reused with a different request body.',
                    );
                }

                return normalizeResponseBody(existingTransfer);
            } else {
                transferRecord = insertTransferRes.rows[0];
            }


            const firstAccount = await client.query(
                `SELECT * FROM accounts WHERE id = $1 FOR UPDATE`,
                [firstId],
            ).then(res => res.rows[0]);

            if (!firstAccount) {
                throw new NotFoundException(`Account with id ${firstId} not found.`);
            }

            const secondAccount = await client.query(
                `SELECT * FROM accounts WHERE id = $1 FOR UPDATE`,
                [secondId],
            ).then(res => res.rows[0]);

            if (!secondAccount) {
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

            const sourceBalance = Number(sourceAccount.available_balance_minor);
            // console.log(sourceAccount.available_balance_minor, dto.amount_minor);
            if (sourceBalance < dto.amount_minor) {
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



            await client.query(
                `INSERT INTO ledger_entries 
                        (transfer_id, account_id, entry_type, side, amount_minor, currency) 
                    VALUES 
                        ($1, $2, 'TRANSFER', 'DEBIT', $3, $4),
                        ($1, $5, 'TRANSFER', 'CREDIT', $3, $4)`,
                [transferRecord.id, dto.source_account_id, dto.amount_minor, dto.currency, dto.destination_account_id],
            );


            const responseBody = {
                id: transferRecord.id,
                client_id: user.id,
                idem_key: idemKey,
                source_account_id: dto.source_account_id,
                destination_account_id: dto.destination_account_id,
                amount_minor: dto.amount_minor,
                currency: dto.currency,
                status: 'SUCCESS',
            };

            const updatedTransferRes = await client.query(
                `
                    UPDATE transfers
                    SET
                        status = 'SUCCESS',
                        response_body = $1,
                        updated_at = NOW()
                    WHERE id = $2
                    RETURNING *
                    `,
                [JSON.stringify(responseBody), transferRecord.id],
            );

            const updatedTransfer = updatedTransferRes.rows[0];

            await this.outbox.createEvent(client, {
                aggregateType: 'TRANSFER',
                aggregateId: updatedTransfer.id,
                eventType: 'transfer.completed',
                routingKey: 'transfer.completed',
                payload: {
                    id: updatedTransfer.id,
                    source_account_id: updatedTransfer.source_account_id,
                    destination_account_id: updatedTransfer.destination_account_id,
                    amount_minor: updatedTransfer.amount_minor,
                    currency: updatedTransfer.currency,
                    status: updatedTransfer.status,
                    created_at: updatedTransfer.created_at,

                    // force_fail: true,
                },
            });

            return normalizeResponseBody(updatedTransfer);
        });

        return res;
    }

}
