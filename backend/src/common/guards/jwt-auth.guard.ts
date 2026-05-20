import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header.');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization header.');
    }

    try {
      const payload = await this.jwt.verifyAsync(token);

      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}