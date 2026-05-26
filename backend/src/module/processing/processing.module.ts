import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from '../../db/db.module';
import { ProcessingWorkerService } from './processing-worker.service';

@Module({
  imports: [ConfigModule, DbModule],
  providers: [ProcessingWorkerService],
  exports: [ProcessingWorkerService],
})
export class ProcessingModule {}