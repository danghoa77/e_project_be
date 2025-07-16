import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { UserDocument } from '../schemas/user.schema';
import { RedisService, MailerService, TalkjsService } from '@app/common-auth';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly mailerService: MailerService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private redisService: RedisService,
    private configService: ConfigService,
    private talkjsService: TalkjsService,
  ) {}
  async validateGoogleUser(
    googleId: string,
    email: string,
    firstName: string,
    lastName: string,
    picture: string,
  ): Promise<{ user: UserDocument; accessTokenGG: string }> {
    let user = await this.usersService.findByEmail(email);

    if (!user) {
      const temporaryPassword = await bcrypt.hash(googleId + Date.now(), 10);
      user = await this.usersService.createUser({
        email: email,
        password: temporaryPassword,
        name: `${firstName} ${lastName}`,
        phone: '',
        role: 'customer',
        googleId: googleId,
        photoUrl: picture,
      } as RegisterUserDto);

      if (!user) {
        throw new InternalServerErrorException(
          'Failed to create user from Google OAuth.',
        );
      }
    } else {
      const userIdString = user._id.toString();

      if (!user.googleId || user.googleId !== googleId) {
        user.googleId = googleId;
      }
      if (!user.photoUrl || user.photoUrl !== picture) {
        user.photoUrl = picture;
      }
      if (!user.isModified()) {
        await user.save();
      }
    }

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      phone: user.phone,
    };
    const accessTokenGG = this.jwtService.sign(payload);

    await this.redisService.set(
      `session:${user._id.toString()}`,
      JSON.stringify(payload),
      3600,
    );

    return { user, accessTokenGG };
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Partial<UserDocument> | null> {
    const user = await this.usersService.findByEmail(email);

    if (user && (await bcrypt.compare(pass, user.password))) {
      const { ...result } = user.toObject();
      return result;
    }

    return null;
  }

  async login(user: UserDocument): Promise<{ access_token: string }> {
    const payload = {
      email: user.email,
      sub: user._id.toString(),
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    const jwtExpirationRaw =
      this.configService.get<string>('JWT_EXPIRATION_TIME') || '1h';
    const hours = parseInt(jwtExpirationRaw.replace(/\D/g, '')) || 1;
    const ttlInSeconds = hours * 3600;

    const redisKey = `session:${user._id.toString()}`;

    const result = await this.redisService.set(
      redisKey,
      accessToken,
      ttlInSeconds,
    );
    this.logger.log(
      `User ${user.email} logged in. Redis SET result: ${result}, Key: ${redisKey}, TTL: ${ttlInSeconds}s`,
    );

    return { access_token: accessToken };
  }

  async register(
    registerUserDto: RegisterUserDto,
  ): Promise<{ access_token: string }> {
    const existingUser = await this.usersService.findByEmail(
      registerUserDto.email,
    );
    if (existingUser) {
      throw new BadRequestException('Email already exists.');
    }
    const newUser = await this.usersService.createUser(registerUserDto);
    await this.talkjsService.upsertUser({
      _id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone,
    });
    this.logger.log(`User ${newUser.email} registered successfully.`);
    this.logger.log(`User ${newUser._id} TalkJs registered successfully.`);
    try {
      await this.mailerService.sendMail({
        to: newUser.email,
        subject: 'Welcome to Our Service',
        html: `<p>Dear ${newUser.name},</p><p>Thank you for registering with us!</p>`,
        from: this.configService.get<string>('MAIL_FROM') || '',
      });
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${newUser.email}`,
        error,
      );
      throw new BadRequestException('Failed to send welcome email.');
    }
    return this.login(newUser);
  }

  async logout(userId: string): Promise<void> {
    await this.redisService.del(`session:${userId}`);
    this.logger.log(`User with ID ${userId} logged out successfully.`);
  }
}
