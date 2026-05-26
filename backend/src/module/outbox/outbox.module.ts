import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { MessagingModule } from '../messaging/messaging.module';
import { OutboxService } from './outbox.service';
import { OutboxWorkerService } from './outbox-worker.service';

@Module({
  imports: [DbModule, MessagingModule],
  providers: [OutboxService, OutboxWorkerService],
  exports: [OutboxService, OutboxWorkerService],
})
export class OutboxModule {}