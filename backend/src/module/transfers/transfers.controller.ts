import { BadRequestException, Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { TransfersService } from "./transfers.service";
import { CreateTransferDto } from "./dto/create_transfers.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
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

@Controller("v1/transfers")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransfersController {
    constructor(private readonly transfersService: TransfersService) {}

    @Get()
    async getAll(
        @CurrentUser() user: AuthUser,
        @Query('limit', new DefaultValuePipe(MAX_LIMIT), ParseIntPipe) limit: number,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    ) {
        const pagination = normalizePagination(limit, offset);
        const result = await this.transfersService.getAll(user, pagination.limit, pagination.offset);
        return { data: result.rows, meta: { ...pagination, total: result.total } };
    }

    @Get(':id')
    async findOne(
        @CurrentUser() user: AuthUser,
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        const data = await this.transfersService.findOne(user, id);
        return { data };
    }

    @Post()
    create(
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateTransferDto,
    ) {
        return this.transfersService.create(user, dto);
    }
}