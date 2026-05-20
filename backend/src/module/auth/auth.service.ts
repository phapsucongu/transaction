import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DbService } from '../../db/db.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.db.query(
      `
      SELECT id
      FROM app_users
      WHERE email = $1
      `,
      [dto.email],
    );

    if (existing.rowCount > 0) {
      throw new BadRequestException('Email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.db.query(
      `
      INSERT INTO app_users (
        email,
        password_hash,
        full_name,
        role
      )
      VALUES ($1, $2, $3, 'USER')
      RETURNING
        id,
        email,
        full_name,
        role,
        status,
        created_at
      `,
      [dto.email, passwordHash, dto.full_name],
    );

    return result.rows[0];
  }

  async login(dto: LoginDto) {
    const result = await this.db.query(
      `
      SELECT
        id,
        email,
        password_hash,
        full_name,
        role,
        status
      FROM app_users
      WHERE email = $1
      `,
      [dto.email],
    );

    const user = result.rows[0];

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is locked.');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.password_hash);

    if (!passwordOk) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwt.signAsync(payload);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }
}