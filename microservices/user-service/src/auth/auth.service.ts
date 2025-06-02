// user-service/src/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { User } from '../schemas/user.schema';
import { RedisService } from '@app/common-auth/redis/redis.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private redisService: RedisService,
        private configService: ConfigService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user.toObject();
            return result;
        }
        return null;
    }

    // async login(user: User) {
    async login(user: User) {
        const payload = { email: user.email, sub: user._id, role: user.role };
        const accessToken = this.jwtService.sign(payload);

        // Lưu session token vào Redis
        // Key: `session:${userId}`
        // Value: accessToken
        // TTL: configured in .env
        const jwtExpirationSeconds = this.configService.get<string>('JWT_EXPIRATION_TIME');
        const ttlInSeconds = parseInt(jwtExpirationSeconds!.slice(0, -1)) * 3600;

        await this.redisService.set(`session:${user._id}`, accessToken, ttlInSeconds);
        this.logger.log(`User ${user.email} logged in successfully. Access token generated.`);
        return {
            access_token: accessToken,
        };
    }

    async register(registerUserDto: RegisterUserDto) {
        const existingUser = await this.usersService.findByEmail(registerUserDto.email);
        if (existingUser) {
            throw new BadRequestException('Email already exists.');
        }
        const newUser = await this.usersService.createUser(registerUserDto);
        this.logger.log(`User ${newUser.email} registered successfully.`);
        return this.login(newUser);
    }

    async logout(userId: string) {
        await this.redisService.del(`session:${userId}`);
        this.logger.log(`User with ID ${userId} logged out successfully.`);
    }
}