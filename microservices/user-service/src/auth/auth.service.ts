import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { UserDocument } from '../schemas/user.schema';
import { RedisService } from '@app/common-auth';
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

    async validateUser(email: string, pass: string): Promise<UserDocument | null> {
        const user = await this.usersService.findByEmail(email);
        if (user && (await bcrypt.compare(pass, user.password))) {
            return user as UserDocument;
        }
        return null;
    }

    async login(user: UserDocument): Promise<{ access_token: string }> {
        const payload = { email: user.email, sub: user._id.toString(), role: user.role };
        const accessToken = this.jwtService.sign(payload);

        const jwtExpirationRaw = this.configService.get<string>('JWT_EXPIRATION_TIME') || '1h';
        const hours = parseInt(jwtExpirationRaw.replace(/\D/g, '')) || 1;
        const ttlInSeconds = hours * 3600;

        const redisKey = `session:${user._id.toString()}`;

        const result = await this.redisService.set(redisKey, accessToken, ttlInSeconds);
        this.logger.log(`User ${user.email} logged in. Redis SET result: ${result}, Key: ${redisKey}, TTL: ${ttlInSeconds}s`);

        return { access_token: accessToken };
    }



    async register(registerUserDto: RegisterUserDto): Promise<{ access_token: string }> {
        const existingUser = await this.usersService.findByEmail(registerUserDto.email);
        if (existingUser) {
            throw new BadRequestException('Email already exists.');
        }
        const newUser = await this.usersService.createUser(registerUserDto);
        this.logger.log(`User ${newUser.email} registered successfully.`);
        return this.login(newUser as UserDocument);
    }

    async logout(userId: string): Promise<void> {
        await this.redisService.del(`session:${userId}`);
        this.logger.log(`User with ID ${userId} logged out successfully.`);
    }
}