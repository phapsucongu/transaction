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
    ) {}


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
            `, [this.configService.get<string>('CONSUMER_NAME') ||'transfer-processing-worker', messageId]
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

    async start() {
        const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL') ;

        if (!rabbitmqUrl) {
            this.logger.error('RABBITMQ_URL is not defined in configuration');
            throw new Error('Missing RABBITMQ_URL configuration');
        }
        const queueName = this.configService.get<string>('RABBITMQ_TRANSFER_QUEUE') || 'txsim.transfer.events';
        
        this.connection = await amqp.connect(rabbitmqUrl);
        this.channel = await this.connection.createChannel();
        await this.channel?.assertQueue(queueName, { durable: true });

        await this.channel?.prefetch(5);

        this.logger.log(`Processing worker is consuming queue: ${queueName}`);

        await this.channel.consume(queueName, async (msg) => {
                if (!msg) {
                    this.logger.warn('Received empty message');
                    return;
                }
                const messageId = msg.properties.messageId ?? 'no-message-id';

                try {

                    this.logger.log(`Received message with ID: ${messageId}`);
                    await this.handleMessage(msg);
                    this.channel!.ack(msg);
                    this.logger.log(`Acked message with ID: ${messageId}`);
                }
                catch (error: any) {
                    this.logger.error(`Error processing message: ${error.message}`, error.stack);
                    this.channel?.nack(msg, false, true);
                    this.logger.log(`Nacked message with ID: ${messageId} for retry`);
                }

            },
            
            { noAck: false }
        );


    }

    async onModuleDestroy() {
        this.logger.log('Shutting down processing worker...');
        await this.channel?.close();
        await this.connection?.close();
    }
}