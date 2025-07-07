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
    BadRequestException
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { RolesGuard, JwtAuthGuard, Role } from '@app/common-auth';
import { LocalAuthGuard } from './strategies/local-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from '../schemas/user.schema';

interface AuthenticatedUser {
    userId?: string;
    _id?: string;
    email?: string;
    name?: string;
    phone?: string;
    role?: 'customer' | 'admin';
    googleId?: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
    accessToken?: string;
    refreshToken?: string;
}

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService
    ) { }

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth(@Req() req: Request) { }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
        const googleUser = req.user as AuthenticatedUser;

        try {
            const result = await this.authService.validateGoogleUser(
                googleUser.googleId || '',
                googleUser.email || '',
                googleUser.firstName || '',
                googleUser.lastName || '',
                googleUser.picture || '',
                googleUser.accessToken || '',
            );

            const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

            if (result && result.accessTokenGG) {
                res.redirect(`${frontendUrl}/auth-success?token=${result.accessTokenGG}`);
            } else {
                res.redirect(`${frontendUrl}/auth-failure`);
            }
        } catch (error) {
            console.error('Google auth error:', error);
            const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth-failure`);
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
        const userIdToLogout = (req.user as AuthenticatedUser).userId || (req.user as AuthenticatedUser)._id?.toString();

        if (!userIdToLogout) {
            throw new BadRequestException('User ID not found in token for logout.');
        }

        await this.authService.logout(userIdToLogout);
        return { message: 'Logout Successful !.' };
    }
}
