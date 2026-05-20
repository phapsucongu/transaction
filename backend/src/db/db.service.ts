import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, QueryResultRow, QueryResult, PoolClient } from "pg";

@Injectable()
export class DbService implements OnModuleDestroy {
    private readonly pool: Pool;
    
    constructor(private readonly configService: ConfigService) {
        this.pool = new Pool({
            connectionString: this.configService.get('DATABASE_URL'),
            max: 10,
        });
    }

    query<T extends QueryResultRow = any>(
        sql: string,
        params?: any[],
    ): Promise<QueryResult<T>> {
        return this.pool.query<T>(sql, params);
    }

    async Transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async onModuleDestroy() {
        await this.pool.end();
    }
}
