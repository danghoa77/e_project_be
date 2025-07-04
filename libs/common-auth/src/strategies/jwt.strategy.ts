//parse token and validate user
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { RedisService } from '../redis/redis.service';

interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || '',
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    const sessionKey = `session:${payload.sub}`;
    const sessionToken = await this.redisService.get(sessionKey);
    if (!sessionToken) {
      throw new UnauthorizedException(
        'You have been logged out. Please log in again.',
      );
    }

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
