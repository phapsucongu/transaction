import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DbModule } from '../../db/db.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { StringValue } from 'ms';

@Module({
  imports: [
    DbModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<StringValue>('JWT_EXPIRES_IN') ?? '1d',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}