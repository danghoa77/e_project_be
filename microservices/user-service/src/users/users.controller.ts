// user-service/src/users/users.controller.ts
import { Controller, Get, Request, UseGuards, ClassSerializerInterceptor, UseInterceptors, Patch, Req, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@app/common-auth';
import { GetUserDto } from './dto/get-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @UseGuards(JwtAuthGuard)
    @UseInterceptors(ClassSerializerInterceptor)
    @Get('me')
    async getProfile(@Request() req: any): Promise<GetUserDto> {
        return this.usersService.findUserById(req.user.userId);
    }

    @Patch('me')
    @UseGuards(JwtAuthGuard)
    async updateMyProfile(
        @Req() req: any,
        @Body() updateUserDto: UpdateUserDto,
    ) {
        const userId = req.user.userId;
        const updatedUser = await this.usersService.updateProfile(
            userId,
            updateUserDto,
        );
        return updatedUser;
    }
}