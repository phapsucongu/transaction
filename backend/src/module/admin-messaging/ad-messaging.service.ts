import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class AdminMessagingService {
    private readonly logger = new Logger(AdminMessagingService.name);

    constructor(private readonly configService: ConfigService) { }

    private async createChannel() {
        const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL');

        if (!rabbitmqUrl) {
            throw new Error('Missing RABBITMQ_URL');
        }

        const connection = await amqp.connect(rabbitmqUrl);
        const channel = await connection.createChannel();

        return {
            connection,
            channel,
        };
    }

    async peekTransferDlq(limit = 10) {
        const dlqName =
            this.configService.get<string>('RABBITMQ_TRANSFER_DLQ') ??
            'txsim.transfer.events.dlq';

        const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

        const { connection, channel } = await this.createChannel();

        const messages: any[] = [];
        const grabbedMessages: any[] = [];

        try {
            await channel.assertQueue(dlqName, {
                durable: true,
            });

            const queueInfo = await channel.checkQueue(dlqName);

            for (let i = 0; i < safeLimit; i++) {
                const msg = await channel.get(dlqName, {
                    noAck: false,
                });

                if (!msg) {
                    break;
                }

                grabbedMessages.push(msg);

                let payload: any;

                try {
                    payload = JSON.parse(msg.content.toString('utf8'));
                } catch {
                    payload = msg.content.toString('utf8');
                }

                messages.push({
                    messageId: msg.properties.messageId,
                    type: msg.properties.type,
                    headers: msg.properties.headers,
                    payload,
                });
            }

            return {
                queue: dlqName,
                readyCountBeforePeek: queueInfo.messageCount,
                returnedCount: messages.length,
                messages,
            };
        } finally {
            for (const msg of grabbedMessages) {
                channel.nack(msg, false, true);
            }

            await channel.close();
            await connection.close();
        }
    }

    async replayTransferDlq(limit = 10) {
        const exchange =
            this.configService.get<string>('RABBITMQ_EXCHANGE') ??
            'txsim.events';

        const dlqName =
            this.configService.get<string>('RABBITMQ_TRANSFER_DLQ') ??
            'txsim.transfer.events.dlq';

        const replayRoutingKey = 'transfer.completed';

        const { connection, channel } = await this.createChannel();

        const replayed: any[] = [];

        try {
            await channel.assertExchange(exchange, 'topic', {
                durable: true,
            });

            await channel.assertQueue(dlqName, {
                durable: true,
            });

            for (let i = 0; i < limit; i++) {
                const msg = await channel.get(dlqName, {
                    noAck: false,
                });

                if (!msg) {
                    break;
                }

                const oldHeaders = msg.properties.headers ?? {};

                const newHeaders = {
                    ...oldHeaders,
                    'x-retry-count': 0,
                    'x-replayed-from-dlq': true,
                    'x-replayed-at': new Date().toISOString(),
                };

                channel.publish(exchange, replayRoutingKey, msg.content, {
                    persistent: true,
                    contentType: msg.properties.contentType,
                    messageId: msg.properties.messageId,
                    type: msg.properties.type,
                    headers: newHeaders,
                });

                channel.ack(msg);

                replayed.push({
                    messageId: msg.properties.messageId,
                    routingKey: replayRoutingKey,
                });
            }

            return {
                from: dlqName,
                toExchange: exchange,
                replayedCount: replayed.length,
                replayed,
            };
        } finally {
            await channel.close();
            await connection.close();
        }
    }
}