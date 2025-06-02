// user-service/src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { RedisService } from '@app/common-auth';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private usersService: UsersService,
        private redisService: RedisService,
    ) {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
        });
    }

    async validate(payload: any) {
        // Kiểm tra xem token có còn trong Redis session không (logout hoặc hết hạn session)
        const sessionToken = await this.redisService.get(`session:${payload.sub}`);
        if (!sessionToken || sessionToken !== payload.access_token) {
            throw new UnauthorizedException('Session has expired or is invalid.');
        }

        const user = await this.usersService.findUserById(payload.sub);
        if (!user) {
            throw new UnauthorizedException('User does not exist.');
        }
        // `payload.access_token` không có trong `payload` mặc định của JWT,
        // cần thêm vào payload khi sign() nếu muốn kiểm tra chính xác token đó.
        // Đơn giản hơn, chỉ cần kiểm tra sự tồn tại của sessionToken là đủ.
        return { userId: payload.sub, email: payload.email, role: payload.role };
    }
}