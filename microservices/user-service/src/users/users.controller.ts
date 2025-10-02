import {
  Controller,
  Get,
  Request,
  UseGuards,
  Patch,
  Req,
  Body,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard, Role, } from '@app/common-auth';
import { GetUserDto } from './dto/get-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDocument } from '../schemas/user.schema';



@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) { }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any): Promise<GetUserDto> {
    return this.usersService.findUserById(req.user.userId);
  }

  @Get('all')
  async getAllUsers(): Promise<UserDocument[]> {
    return this.usersService.findAll();
  }

  @Get('dashboard')
  async getUserDashboardStats() {
    return this.usersService.getUserDashboardStats();
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @Req() req: any,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const userId = req.user.userId;
    return this.usersService.updateProfile(userId, updateUserDto);
  }

  @Get('admin1st')
  async getAdmin1st() {
    return this.usersService.getAdmin1st();
  }

  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<GetUserDto> {
    return this.usersService.findUserById(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Req() req: any) {
    const userId = req.user.userId;
    await this.usersService.deleteUser(userId);
  }

  @Delete('me/addresses/:addressId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyAddress(
    @Req() req: any,
    @Param('addressId') addressId: string,
  ): Promise<void> {
    const userId = req.user.userId;
    await this.usersService.deleteAddress(userId, addressId);
  }
}

