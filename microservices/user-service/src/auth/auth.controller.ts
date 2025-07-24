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
  BadRequestException, Logger
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
    private logger: Logger
  ) {

  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() { }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const googleUser = req.user as GoogleUser;

    try {
      const result: GoogleAuthResult = await this.authService.validateGoogleUser(
        googleUser.googleId,
        googleUser.email,
        googleUser.firstName,
        googleUser.lastName,
        googleUser.picture,
      );

      const frontendBaseUrl = this.configService.get<string>('FRONTEND_URL') || this.configService.get<string>('MOBILE_URL');

      if (result && result.accessTokenGG) {
        const redirectUrl = `${frontendBaseUrl}/auth/success?token=${result.accessTokenGG}`;
        this.logger.log("Redirecting to:", redirectUrl);
        res.setHeader('Content-Type', 'text/html');
        res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Redirecting...</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body>
            <p>Đang chuyển hướng đến ứng dụng web...</p>
            <script>
              window.location.replace('${redirectUrl}');
            </script>
          </body>
        </html>
      `);
      } else {
        const fallback = `${frontendBaseUrl}/auth/failure`;
        res.setHeader('Content-Type', 'text/html');
        res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Đăng nhập thất bại</title>
          </head>
          <body>
            <p>Không thể xác thực tài khoản Google.</p>
            <script>
              window.location.replace('${fallback}');
            </script>
          </body>
        </html>
      `);
      }
    } catch (error) {
      console.error('Google auth error:', error);
      const fallback = `${this.configService.get<string>('FRONTEND_URL') || this.configService.get<string>('MOBILE_URL')}/auth/failure`;
      res.setHeader('Content-Type', 'text/html');
      res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Đăng nhập thất bại</title>
        </head>
        <body>
          <p>Đã xảy ra lỗi khi xác thực tài khoản.</p>
          <script>
            window.location.replace('${fallback}');
          </script>
        </body>
      </html>
    `);
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
