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

// Cập nhật AuthenticatedUser interface để phản ánh các trường có thể undefined
interface AuthenticatedUser {
    userId?: string;
    _id?: string; // MongoDB _id (thường là string sau toString())
    email?: string; // Email có thể là undefined từ Google nếu bạn không có trong scope hoặc lỗi
    name?: string;
    phone?: string;
    role?: 'customer' | 'admin'; // Role có thể là undefined nếu không được trả về từ Strategy

    // Các thuộc tính cụ thể từ GoogleStrategy.validate()
    googleId?: string; // <-- Đây là trường gây lỗi 1
    firstName?: string; // <-- Đây là trường gây lỗi 1
    lastName?: string; // <-- Đây là trường gây lỗi 1
    picture?: string; // <-- Đây là trường gây lỗi 1
    accessToken?: string; // <-- Đây là trường gây lỗi 1
    refreshToken?: string;
}

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService
    ) { }

    // --- GOOGLE AUTH ROUTES ---
    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth(@Req() req: Request) { }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
        const googleUser = req.user as AuthenticatedUser;

        try {
            const result = await this.authService.validateGoogleUser(
                googleUser.googleId || '', // Cung cấp giá trị mặc định nếu undefined
                googleUser.email || '',
                googleUser.firstName || '',
                googleUser.lastName || '',
                googleUser.picture || '',
                googleUser.accessToken || '',
            );

            if (result && result.accessTokenGG) {
                // Use environment variable for frontend URL or fall back to localhost
                const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
                res.redirect(`${frontendUrl}/auth-success?token=${result.accessTokenGG}`);
            } else {
                const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
                res.redirect(`${frontendUrl}/auth-failure`);
            }
        } catch (error) {
            console.error('Google auth error:', error);
            const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth-failure`);
        }
    }
    // --- END GOOGLE AUTH ROUTES ---

    // --- LOCAL AUTH ROUTES ---
    @Post('register')
    async register(@Body() registerUserDto: RegisterUserDto) {
        return this.authService.register(registerUserDto);
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Req() req: Request) {
        // req.user from LocalAuthGuard should be a UserDocument
        return this.authService.login(req.user as UserDocument);
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Req() req: Request) {
        // Lỗi này xảy ra vì req.user.userId có thể là undefined.
        // Bạn cần đảm bảo nó luôn là string khi truyền vào logout.
        // req.user.userId thường đến từ payload JWT, nên nó sẽ tồn tại nếu JWT hợp lệ.
        // Tuy nhiên, để đảm bảo an toàn kiểu, ta có thể dùng || '' hoặc kiểm tra.
        const userIdToLogout = (req.user as AuthenticatedUser).userId || (req.user as AuthenticatedUser)._id?.toString();

        if (!userIdToLogout) {
            throw new BadRequestException('User ID not found in token for logout.');
        }

        await this.authService.logout(userIdToLogout);
        return { message: 'Logout Successful !.' };
    }
// --- END LOCAL AUTH ROUTES ---
  }