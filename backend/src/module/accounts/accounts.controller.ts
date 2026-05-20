import { BadRequestException, Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Put, Query, UseGuards } from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import { TopUpDto } from "./dto/topup.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthUser } from "../../common/types/auth-user";

const MAX_LIMIT = 100;

const normalizePagination = (limit: number, offset: number) => {
    if (limit < 1 || limit > MAX_LIMIT) {
        throw new BadRequestException(`limit must be between 1 and ${MAX_LIMIT}`);
    }

    if (offset < 0) {
        throw new BadRequestException('offset must be greater than or equal to 0');
    }

    return { limit, offset };
};

@Controller('v1/accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountsController {
    constructor(private readonly accountsService: AccountsService) {}

    @Post()
    @Roles('ADMIN')
    create(
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateAccountDto,
    ) {
        return this.accountsService.create(user, dto);
    }

    @Get()
    async getAll(
        @CurrentUser() user: AuthUser,
        @Query('limit', new DefaultValuePipe(MAX_LIMIT), ParseIntPipe) limit: number,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    ) {
        const pagination = normalizePagination(limit, offset);
        const result = await this.accountsService.getAll(user, pagination.limit, pagination.offset);
        return { data: result.rows, meta: { ...pagination, total: result.total } };
    }

    @Get(':id')
    findOne(
        @CurrentUser() user: AuthUser,
        @Param('id') id: string,
    ) {
        return this.accountsService.findOne(user, id);
    }

    @Get(':id/transfers')
    async getTransfers(
        @CurrentUser() user: AuthUser,
        @Param('id', new ParseUUIDPipe()) id: string,
        @Query('limit', new DefaultValuePipe(MAX_LIMIT), ParseIntPipe) limit: number,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    ) {
        const pagination = normalizePagination(limit, offset);
        const result = await this.accountsService.getTransfers(user, id, pagination.limit, pagination.offset);
        return { data: result.rows, meta: { ...pagination, total: result.total } };
    }

    @Get(':id/ledger')
    async getLedger(
        @CurrentUser() user: AuthUser,
        @Param('id', new ParseUUIDPipe()) id: string,
        @Query('limit', new DefaultValuePipe(MAX_LIMIT), ParseIntPipe) limit: number,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    ) {
        const pagination = normalizePagination(limit, offset);
        const result = await this.accountsService.getLedger(user, id, pagination.limit, pagination.offset);
        return { data: result.rows, meta: { ...pagination, total: result.total } };
    }

    @Post(':id/topup')
    @Roles('ADMIN')
    topup(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: TopUpDto,
    ) {
    return this.accountsService.topUp(id, dto.amount_minor);
    }

    @Put(':id/lock')
    @Roles('ADMIN')
    lock(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.accountsService.lock(id);
    }

    @Put(':id/unlock')
    @Roles('ADMIN')
    unlock(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.accountsService.unlock(id);
    }
}