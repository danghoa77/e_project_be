// user-service/src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  Get,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { JwtAuthGuard } from '@app/common-auth';
import { LocalAuthGuard } from './strategies/local-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from '../schemas/user.schema';

interface AuthenticatedUser {
  userId?: string;
  email?: string;
  role?: 'customer' | 'admin';
  googleId?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  accessToken?: string;
}

interface GoogleUser {
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
  accessToken: string;
  googleId: string;
}

interface GoogleAuthResult {
  user: UserDocument;
  accessTokenGG: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const googleUser = req.user as GoogleUser;

    try {
      const result: GoogleAuthResult =
        await this.authService.validateGoogleUser(
          googleUser.googleId,
          googleUser.email,
          googleUser.firstName,
          googleUser.lastName,
          googleUser.picture,
        );

      const mobileScheme =
        this.configService.get<string>('MOBILE_APP_SCHEME') || 'my-e-project';

      if (result && result.accessTokenGG) {
        const deepLinkWithToken = `${mobileScheme}://auth/success?token=${result.accessTokenGG}`;
        res.status(302).setHeader('Location', deepLinkWithToken);
        res.end();
      } else {
        res.redirect(`${mobileScheme}://auth/failure`);
      }
    } catch (error) {
      console.error('Google auth error:', error);
      const mobileScheme =
        this.configService.get<string>('MOBILE_APP_SCHEME') ||
        'e_project_mobile';
      res.redirect(`${mobileScheme}://auth/failure`);
    }
  }

  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: Request) {
    return this.authService.login(req.user as UserDocument);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request) {
    const userId = (req.user as AuthenticatedUser).userId;

    if (!userId) {
      throw new BadRequestException('User ID not found in token for logout.');
    }

    await this.authService.logout(userId);
    return { message: 'Logout Successful !.' };
  }
}
