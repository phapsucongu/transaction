import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { RabbitmqPublisher } from '../messaging/rabbitmq.publisher';

@Injectable()
export class OutboxWorkerService {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private shouldStop = false;

  constructor(
    private readonly db: DbService,
    private readonly publisher: RabbitmqPublisher,
  ) {}

  async start() {
    this.logger.log('Outbox worker started.');

    while (!this.shouldStop) {
      try {
        const events = await this.pickEvents(10);

        if (events.length === 0) {
          await this.sleep(1000);
          continue;
        }

        for (const event of events) {
          await this.publishOne(event);
        }
      } catch (error: any) {
        this.logger.error(
          `Outbox loop error: ${error.message}`,
          error.stack,
        );
        await this.sleep(2000);
      }
    }
  }

  stop() {
    this.shouldStop = true;
  }

  private async pickEvents(limit: number) {
    return this.db.Transaction(async (client) => {
      const result = await client.query(
        `
        WITH picked AS (
          SELECT id
          FROM outbox_events
          WHERE published_at IS NULL
            AND (
              next_retry_at IS NULL
              OR next_retry_at <= NOW()
            )
            AND (
              locked_at IS NULL
              OR locked_at < NOW() - INTERVAL '30 seconds'
            )
          ORDER BY created_at ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE outbox_events o
        SET locked_at = NOW()
        FROM picked
        WHERE o.id = picked.id
        RETURNING o.*
        `,
        [limit],
      );

      return result.rows;
    });
  }

  private async publishOne(event: any) {
    try {
      await this.publisher.publish({
        messageId: event.id,
        routingKey: event.routing_key,
        eventType: event.event_type,
        aggregateId: event.aggregate_id,
        payload: event.payload,
      });

      await this.db.query(
        `
        UPDATE outbox_events
        SET
          published_at = NOW(),
          locked_at = NULL,
          last_error = NULL
        WHERE id = $1
        `,
        [event.id],
      );

      this.logger.log(
        `Published outbox event ${event.id} ${event.event_type}`,
      );
    } catch (error: any) {
      const nextRetryAt = this.calculateNextRetryAt(event.attempts);

      await this.db.query(
        `
        UPDATE outbox_events
        SET
          attempts = attempts + 1,
          next_retry_at = $2,
          locked_at = NULL,
          last_error = $3
        WHERE id = $1
        `,
        [event.id, nextRetryAt, error.message],
      );

      this.logger.error(
        `Failed to publish outbox event ${event.id}: ${error.message}`,
      );
    }
  }

  private calculateNextRetryAt(attempts: number) {
    const nextAttempts = attempts + 1;

    const delaySeconds =
      nextAttempts === 1 ? 5 :
      nextAttempts === 2 ? 30 :
      nextAttempts === 3 ? 120 :
      300;

    return new Date(Date.now() + delaySeconds * 1000);
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}