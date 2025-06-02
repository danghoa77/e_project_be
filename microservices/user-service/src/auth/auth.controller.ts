// user-service/src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Request, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { LocalAuthGuard } from '@app/common-auth/guards/local-auth.guard';
import { JwtAuthGuard } from '@app/common-auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common-auth/guards/roles.guard';
import { Roles } from '../../../../libs/common-auth/src/decorator/roles.decorator';
import { GetUserDto } from '../users/dto/get-user.dto';
import { plainToClass } from 'class-transformer';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(@Body() registerUserDto: RegisterUserDto) {
        return this.authService.register(registerUserDto);
    }

    @UseGuards(LocalAuthGuard) // Sử dụng LocalAuthGuard cho đăng nhập
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Request() req: any) {
        return this.authService.login(req.user);
    }

    @UseGuards(JwtAuthGuard) //JWT để truy cập
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Request() req: any) {
        await this.authService.logout(req.user.userId);
        return { message: 'Logout Successful !.' };
    }
}