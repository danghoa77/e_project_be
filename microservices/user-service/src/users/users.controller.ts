import {
  Controller,
  Get,
  Request,
  UseGuards,
  Patch,
  Req,
  Body,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@app/common-auth';
import { GetUserDto } from './dto/get-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetAllDto } from './dto/get-all.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) { }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: AuthenticatedRequest): Promise<GetUserDto> {
    return this.usersService.findUserById(req.user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @Req() req: AuthenticatedRequest,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const userId = req.user.userId;
    const updatedUser = await this.usersService.updateProfile(
      userId,
      updateUserDto,
    );
    return updatedUser;
  }

  @Get('all')
  async getAllUsers(): Promise<GetAllDto[]> {
    return this.usersService.findAll();
  }

  @Delete('id')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    await this.usersService.deleteUser(userId);
  }
}
