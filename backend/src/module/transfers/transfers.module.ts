import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { TransfersController } from "./transfers.controller";
import { TransfersService } from "./transfers.service";
import { AuthModule } from "../auth/auth.module";

@Module({
    imports: [DbModule, AuthModule],
    controllers: [TransfersController],
    providers: [TransfersService],
})
export class TransfersModule {}