import { Type } from "class-transformer";
import { IsInt, IsUUID, Matches, Min } from "class-validator";

export class CreateTransferDto {
    @IsUUID()
    source_account_id: string = '';

    @IsUUID()
    destination_account_id: string = '';

    @Type(() => Number)
    @IsInt()
    @Min(1)
    amount_minor: number = 0;

    @Matches(/^[A-Z]{3}$/)
    currency: string = '';
}