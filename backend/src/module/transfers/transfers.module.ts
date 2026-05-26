import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { AuthModule } from '../auth/auth.module';
import { OutboxModule } from '../outbox/outbox.module';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
    imports: [DbModule, AuthModule, OutboxModule],
    controllers: [TransfersController],
    providers: [TransfersService],
})
export class TransfersModule { }
