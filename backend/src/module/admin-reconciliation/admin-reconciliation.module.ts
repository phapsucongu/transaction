import { Module } from '@nestjs/common';
import { AdminReconciliationController } from './admin-reconciliation.controller';
import { AdminReconciliationService } from './admin-reconciliation.service';
import { AuthModule } from '../auth/auth.module';
import { DbModule } from '../../db/db.module';

@Module({
    imports: [AuthModule, DbModule],
    controllers: [AdminReconciliationController],
    providers: [AdminReconciliationService],
})
export class AdminReconciliationModule { }