import { Controller, Get } from "@nestjs/common";
import { DbService } from "../../db/db.service";

@Controller()
export class HealthController {
    constructor(private readonly db: DbService) {}

    @Get('/health/live')
    async live() {
        return 'OK';
    }

    @Get('/health/ready')
    async ready() {
        try {
            await this.db.query('SELECT 1');
            return 'OK';
        } catch (error) {
            throw new Error('Database connection failed');
        }
    }
}