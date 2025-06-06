// user-service/src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Request, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtService } from '@nestjs/jwt';
import { GetUserDto } from '../users/dto/get-user.dto';
import { plainToClass } from 'class-transformer';
import { RolesGuard, JwtAuthGuard, Role } from '@app/common-auth';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(@Body() registerUserDto: RegisterUserDto) {
        return this.authService.register(registerUserDto);
    }

    @UseGuards(LocalStrategy) //Check email and password with local strategy
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Request() req: any) {
        return this.authService.login(req.user);
    }

    @UseGuards(JwtAuthGuard) //JWT Check
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Request() req: any) {
        await this.authService.logout(req.user.userId);
        return { message: 'Logout Successful !.' };
    }
}