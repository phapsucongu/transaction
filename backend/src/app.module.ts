import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { HealthModule } from './module/health/health.module';
import { AccountsModule } from './module/accounts/accounts.module';
import { TransfersModule } from './module/transfers/transfers.module';
import { AuthModule } from './module/auth/auth.module';
import { ProcessingModule } from './module/processing/processing.module';
import { AdminMessagingModule } from './module/admin-messaging/ad-messaging.module';
import { AdminReconciliationModule } from './module/admin-reconciliation/admin-reconciliation.module';

@Module({
  imports: [
    ConfigModule.forRoot(
      {
        isGlobal: true,
      }
    ),
    DbModule,
    HealthModule,
    AccountsModule,
    TransfersModule,
    AuthModule,
    ProcessingModule,
    AdminMessagingModule,
    AdminReconciliationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
