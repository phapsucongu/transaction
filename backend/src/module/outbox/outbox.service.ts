import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { DbService } from "../../db/db.service";

type CreateOutboxEventInput = {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    routingKey: string;
    payload: unknown;
};


@Injectable()
export class OutboxService {
    constructor(private readonly db: DbService) { }
    
    async createEvent(
        client: PoolClient,
        input: CreateOutboxEventInput
    ) {
        const { aggregateType, aggregateId, eventType, routingKey, payload } = input;   
        const result = await client.query(
            `INSERT INTO outbox_events (
                aggregate_type,
                aggregate_id,
                event_type,
                routing_key,
                payload
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [aggregateType, aggregateId, eventType, routingKey, JSON.stringify(payload)],
        );

        return result.rows[0];
    }
}  
