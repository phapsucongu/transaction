import { Module } from '@nestjs/common';
import { AdminMessagingController } from './ad-messaging.controller';
import { AdminMessagingService } from './ad-messaging.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [AuthModule],
    controllers: [AdminMessagingController],
    providers: [AdminMessagingService],
})
export class AdminMessagingModule {}