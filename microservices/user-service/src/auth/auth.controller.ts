// src/auth/auth.controller.ts

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
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { JwtAuthGuard } from '@app/common-auth';
import { LocalAuthGuard } from './strategies/local-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from '../schemas/user.schema';
import { AuthenticatedUser, GooglePassportUser } from './dto/auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) { }

  // @Post('google/token')
  // @HttpCode(HttpStatus.OK)
  // async googleLoginWithToken(@Body() idToken: string) {
  //   const { access_token } = await this.authService.loginWithGoogleToken(idToken);
  //   return { access_token: access_token };
  // }


  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() { /* Passport handles the redirect */ }


  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const googleUser = req.user as GooglePassportUser;

    try {
      const { access_token } = await this.authService.validateGooglePassportUser(googleUser);

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const redirectUrl = `${frontendUrl}/auth/callback?token=${access_token}`;

      this.logger.log(`Redirecting to: ${redirectUrl}`);
      res.redirect(redirectUrl);

    } catch (error) {
      this.logger.error('Google auth callback error:', error.stack);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      res.redirect(`${frontendUrl}/login?error=auth_failed`);
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
    return { message: 'Logout Successful!' };
  }
}