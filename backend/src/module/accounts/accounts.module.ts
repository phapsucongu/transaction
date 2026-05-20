import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";
import { AuthModule } from "../auth/auth.module";

@Module({
    imports: [DbModule, AuthModule],
    controllers: [AccountsController],
    providers: [AccountsService],
})
export class AccountsModule {}