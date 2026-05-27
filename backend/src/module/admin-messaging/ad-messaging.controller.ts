import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminMessagingService } from './ad-messaging.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('v1/admin/messaging')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminMessagingController {
  constructor(
    private readonly adminMessagingService: AdminMessagingService,
  ) {}

  @Get('transfer-dlq')
  peekTransferDlq(@Query('limit') limit?: string) {
    return this.adminMessagingService.peekTransferDlq(
      Number(limit ?? 10),
    );
  }

  @Post('transfer-dlq/replay')
  replayTransferDlq(@Query('limit') limit?: string) {
    return this.adminMessagingService.replayTransferDlq(
      Number(limit ?? 10),
    );
  }
}