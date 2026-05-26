import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

type PublishInput = {
  messageId: string;
  routingKey: string;
  eventType: string;
  aggregateId: string;
  payload: unknown;
};

@Injectable()
export class RabbitmqPublisher implements OnModuleDestroy {
  private connection?: amqp.ChannelModel;
  private channel?: amqp.Channel;

  constructor(private readonly config: ConfigService) {}

  private async getChannel() {
    if (this.channel) {
      return this.channel;
    }

    const rabbitUrl = this.config.getOrThrow<string>('RABBITMQ_URL');
    const exchange =
      this.config.get<string>('RABBITMQ_EXCHANGE') ?? 'txsim.events';
    const transferQueue =
      this.config.get<string>('RABBITMQ_TRANSFER_QUEUE') ??
      'txsim.transfer.events';

    const connection = await amqp.connect(rabbitUrl);
    const channel = await connection.createChannel();

    await channel.assertExchange(exchange, 'topic', {
      durable: true,
    });

    await channel.assertQueue(transferQueue, {
      durable: true,
    });

    await channel.bindQueue(transferQueue, exchange, 'transfer.*');

    this.connection = connection;
    this.channel = channel;

    return channel;
  }

  async publish(input: PublishInput) {
    const channel = await this.getChannel();

    const exchange =
      this.config.get<string>('RABBITMQ_EXCHANGE') ?? 'txsim.events';

    const payloadBuffer = Buffer.from(JSON.stringify(input.payload));

    const ok = channel.publish(exchange, input.routingKey, payloadBuffer, {
      persistent: true,
      contentType: 'application/json',
      messageId: input.messageId,
      type: input.eventType,
      headers: {
        event_type: input.eventType,
        aggregate_id: input.aggregateId,
      },
    });

    if (!ok) {
      throw new Error('RabbitMQ publish buffer is full.');
    }
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}
