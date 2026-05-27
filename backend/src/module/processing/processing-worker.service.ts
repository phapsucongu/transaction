import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { DbService } from '../../db/db.service';

@Injectable()
export class ProcessingWorkerService implements OnModuleDestroy {
    private readonly logger = new Logger(ProcessingWorkerService.name);

    private connection?: amqp.ChannelModel;
    private channel?: amqp.Channel;

    constructor(
        private readonly configService: ConfigService,
        private readonly dbService: DbService,
    ) { }


    private async processTransferEvent(
        client: any,
        input: {
            messageId: string;
            eventType: string;
            payload: any;
        }
    ) {
        if (input.eventType !== 'transfer.completed') {
            this.logger.warn(`Received unexpected event type: ${input.eventType}`);
            return;
        }


        // /* 
        //     force_fail test
        // */
        // if (input.payload.force_fail === true) {
        //     throw new Error('Forced processing failure for testing.');
        // }

        this.logger.log(`Processing transfer event with messageId: ${input.messageId}`);


    }
    private async handleMessage(msg: amqp.ConsumeMessage) {
        const messageId = msg.properties.messageId;

        if (!messageId) {
            this.logger.warn('Received message without messageId, skipping');
            return;
        }

        const eventType =
            msg.properties.type ??
            msg.properties.headers?.event_type ??
            msg.properties.headers?.eventType ??
            'unknown';

        const rawBody = msg.content.toString();

        let payload: any;
        try {
            payload = JSON.parse(rawBody);
        }
        catch (error: any) {
            this.logger.error(`Failed to parse message body as JSON: ${error.message}`);
            throw new Error('Invalid message format');
        }

        this.logger.log(`Processing message ${messageId} of type ${eventType}`);

        await this.dbService.Transaction(async (client) => {

            const insertProcessedResult = await client.query(`
                INSERT INTO processed_messages (consumer_name, message_id)
                VALUES ($1, $2)
                ON CONFLICT (consumer_name, message_id) DO NOTHING
                RETURNING consumer_name, message_id
            `, [this.configService.get<string>('CONSUMER_NAME') || 'transfer-processing-worker', messageId]
            );

            if (insertProcessedResult.rowCount === 0) {
                this.logger.warn(`Message ${messageId} has already been processed, skipping`);
                return;
            }

            await this.processTransferEvent(client, {
                messageId,
                eventType,
                payload
            });

            this.logger.log(`Message ${messageId} processed and stored in database`);
        });
    }

    private async handleFailedMessage(
        msg: amqp.ConsumeMessage,
        error: Error,
    ) {
        if (!this.channel) {
            throw new Error('RabbitMQ channel is not initialized.');
        }

        const retryQueueName =
            this.configService.get<string>('RABBITMQ_TRANSFER_RETRY_QUEUE') ??
            'txsim.transfer.events.retry';

        const dlqName =
            this.configService.get<string>('RABBITMQ_TRANSFER_DLQ') ??
            'txsim.transfer.events.dlq';

        const maxRetries = Number(
            this.configService.get<string>('PROCESSING_MAX_RETRIES') ?? 3,
        );

        const currentRetryCount = Number(
            msg.properties.headers?.['x-retry-count'] ?? 0,
        );

        const nextRetryCount = currentRetryCount + 1;

        const messageId = msg.properties.messageId ?? 'no-message-id';

        const headers = {
            ...(msg.properties.headers ?? {}),
            'x-retry-count': nextRetryCount,
            'x-last-error': error.message,
            'x-failed-at': new Date().toISOString(),
        };

        if (currentRetryCount >= maxRetries) {
            this.channel.sendToQueue(dlqName, msg.content, {
                persistent: true,
                contentType: msg.properties.contentType,
                messageId: msg.properties.messageId,
                type: msg.properties.type,
                headers,
            });

            /**
             * Ack message gốc sau khi đã copy sang DLQ.
             * Nếu không ack, RabbitMQ sẽ giữ hoặc redeliver message gốc.
             */
            this.channel.ack(msg);

            this.logger.error(
                `Message ${messageId} moved to DLQ after ${currentRetryCount} retries.`,
            );

            return;
        }

        this.channel.sendToQueue(retryQueueName, msg.content, {
            persistent: true,
            contentType: msg.properties.contentType,
            messageId: msg.properties.messageId,
            type: msg.properties.type,
            headers,
        });

        /**
         * Ack message gốc sau khi đã copy sang retry queue.
         */
        this.channel.ack(msg);

        this.logger.warn(
            `Message ${messageId} scheduled for retry ${nextRetryCount}/${maxRetries}.`,
        );
    }

    async start() {
        const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL');

        if (!rabbitmqUrl) {
            this.logger.error('RABBITMQ_URL is not defined in configuration');
            throw new Error('Missing RABBITMQ_URL configuration');
        }

        const exchange =
            this.configService.get<string>('RABBITMQ_EXCHANGE') ??
            'txsim.events';

        const queueName =
            this.configService.get<string>('RABBITMQ_TRANSFER_QUEUE') ??
            'txsim.transfer.events';

        const retryQueueName =
            this.configService.get<string>('RABBITMQ_TRANSFER_RETRY_QUEUE') ??
            'txsim.transfer.events.retry';

        const dlqName =
            this.configService.get<string>('RABBITMQ_TRANSFER_DLQ') ??
            'txsim.transfer.events.dlq';

        const retryDelayMs = Number(
            this.configService.get<string>('PROCESSING_RETRY_DELAY_MS') ?? 10000,
        );

        this.connection = await amqp.connect(rabbitmqUrl);
        this.channel = await this.connection.createChannel();

        await this.channel.assertExchange(exchange, 'topic', {
            durable: true,
        });

        await this.channel.assertQueue(queueName, {
            durable: true,
        });

        await this.channel.bindQueue(queueName, exchange, 'transfer.*');

        /**
         * Retry queue:
         * Message nằm ở đây retryDelayMs milliseconds.
         * Sau đó RabbitMQ dead-letter nó về exchange chính,
         * routing key = transfer.completed.
         */
        await this.channel.assertQueue(retryQueueName, {
            durable: true,
            arguments: {
                'x-message-ttl': retryDelayMs,
                'x-dead-letter-exchange': exchange,
                'x-dead-letter-routing-key': 'transfer.completed',
            },
        });

        /**
         * DLQ:
         * Message lỗi quá số lần retry sẽ nằm ở đây.
         */
        await this.channel.assertQueue(dlqName, {
            durable: true,
        });

        await this.channel.prefetch(5);

        await this.channel.consume(
            queueName,
            async (msg) => {
                if (!msg) {
                    this.logger.warn('Received empty message');
                    return;
                }

                const messageId = msg.properties.messageId ?? 'no-message-id';

                try {
                    this.logger.log(`Start handling message ${messageId}`);

                    await this.handleMessage(msg);

                    this.channel!.ack(msg);

                    this.logger.log(`Acked message ${messageId}`);
                } catch (error: any) {
                    this.logger.error(
                        `Error processing message ${messageId}: ${error.message}`,
                        error.stack,
                    );

                    await this.handleFailedMessage(msg, error);
                }
            },
            {
                noAck: false,
            },
        );

        this.logger.log(`Processing worker is consuming queue: ${queueName}`);
    }

    async onModuleDestroy() {
        this.logger.log('Shutting down processing worker...');
        await this.channel?.close();
        await this.connection?.close();
    }
}