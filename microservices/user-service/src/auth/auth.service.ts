// src/auth/auth.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { UserDocument } from '../schemas/user.schema';
import { RedisService, MailerService, TalkjsService } from '@app/common-auth';
import { ConfigService } from '@nestjs/config';
import { GooglePassportUser } from './dto/auth.types';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client;

  constructor(
    private readonly mailerService: MailerService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly talkjsService: TalkjsService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async validateUser(email: string, pass: string): Promise<Partial<UserDocument> | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  private async _handleUserLogin(user: UserDocument): Promise<{ accessToken: string }> {
    const payload = {
      email: user.email,
      sub: user._id.toString(),
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    const sessionData = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const ttlInSeconds = 3600;
    const redisKey = `session:${user._id.toString()}`;

    await this.redisService.set(redisKey, JSON.stringify(sessionData), ttlInSeconds);
    this.logger.log(`User ${user.email} session created. Key: ${redisKey}, TTL: ${ttlInSeconds}s`);
    return { accessToken };
  }

  async loginWithGoogleToken(idToken: string): Promise<{ accessToken: string }> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      const googlePayload = ticket.getPayload();
      if (!googlePayload) {
        throw new UnauthorizedException('Invalid Google ID token.');
      }

      const { sub, email, given_name, family_name, picture } = googlePayload;
      if (!sub || !email) {
        throw new UnauthorizedException('Google token is missing required user information (ID or Email).');
      }

      const userProfile = {
        googleId: sub,
        email,
        firstName: given_name || '',
        lastName: family_name || '',
        picture: picture || '',
      };

      const user = await this._findOrCreateGoogleUser(userProfile);
      return this._handleUserLogin(user);
    } catch (error) {
      this.logger.error('Google token validation failed', error);
      throw new UnauthorizedException('Failed to validate Google token.');
    }
  }

  async validateGooglePassportUser(googleUser: GooglePassportUser): Promise<{ accessToken: string }> {
    const userProfile = {
      googleId: googleUser.googleId,
      email: googleUser.email,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
      picture: googleUser.picture,
    };
    const user = await this._findOrCreateGoogleUser(userProfile);
    return this._handleUserLogin(user);
  }

  private async _findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
  }): Promise<UserDocument> {
    let user = await this.usersService.findByEmail(profile.email);

    if (user) {
      let needsSave = false;
      if (!user.googleId) {
        user.googleId = profile.googleId;
        needsSave = true;
      }
      if (profile.picture && user.photoUrl !== profile.picture) {
        user.photoUrl = profile.picture;
        needsSave = true;
      }
      if (needsSave) await user.save();
      return user;
    }

    const newUser = await this.usersService.createUser({
      email: profile.email,
      name: `${profile.firstName} ${profile.lastName || ''}`.trim(),
      googleId: profile.googleId,
      photoUrl: profile.picture,
      password: await bcrypt.hash(Date.now().toString(), 10),
    });
    await this.talkjsService.upsertUser({
      _id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone,
    });

    if (!newUser) {
      throw new InternalServerErrorException('Failed to create user from Google profile.');
    }
    return newUser;
  }

  async login(user: UserDocument): Promise<{ access_token: string }> {
    const { accessToken } = await this._handleUserLogin(user);
    return { access_token: accessToken };
  }

  async register(registerUserDto: RegisterUserDto): Promise<{ access_token: string }> {
    const existingUser = await this.usersService.findByEmail(registerUserDto.email);
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

    try {
      await this.mailerService.sendMail({
        to: newUser.email,
        subject: 'Welcome to Our Service',
        html: `<p>Dear ${newUser.name},</p><p>Thank you for registering with us!</p>`,
        from: this.configService.get<string>('MAIL_FROM') || '',
      });
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${newUser.email}`, error);
      throw new BadRequestException('Failed to send welcome email.');
    }
    return this.login(newUser);
  }

  async logout(userId: string): Promise<void> {
    await this.redisService.del(`session:${userId}`);
    this.logger.log(`User with ID ${userId} logged out successfully.`);
  }
}
