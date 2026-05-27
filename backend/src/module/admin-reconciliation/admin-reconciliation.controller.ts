import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import { AdminReconciliationService } from './admin-reconciliation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('v1/admin/reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminReconciliationController {
    constructor(
        private readonly adminReconciliationService: AdminReconciliationService,
    ) { }

    @Get('accounts')
    checkAllAccounts() {
        return this.adminReconciliationService.checkAllAccounts();
    }

    @Get('accounts/:accountId')
    checkOneAccount(
        @Param('accountId', new ParseUUIDPipe()) accountId: string,
    ) {
        return this.adminReconciliationService.checkOneAccount(accountId);
    }
}