import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Error as MongooseError } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { GetUserDto } from './dto/get-user.dto';
import { plainToClass } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
import { RedisService } from '@app/common-auth';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly redisService: RedisService,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async createUser(userData: Partial<User>): Promise<UserDocument> {
    if (!userData.password) {
      throw new BadRequestException('Password is required to create a user.');
    }
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const createdUser = new this.userModel({
      ...userData,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  async findUserById(id: string): Promise<GetUserDto> {
    const cachedUser = await this.redisService.get(`user:${id}`);
    if (cachedUser) {
      console.log('User data from Redis cache');
      return plainToClass(GetUserDto, JSON.parse(cachedUser));
    }

    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User is not exist.');
    }

    const userDto = plainToClass(GetUserDto, user.toObject());
    await this.redisService.set(`user:${id}`, JSON.stringify(userDto), 60 * 5);
    return userDto;
  }
  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    if (updateUserDto.addresses) {
      const defaultAddresses = updateUserDto.addresses.filter(
        (addr) => addr.isDefault === true,
      );
      if (defaultAddresses.length > 1) {
        throw new BadRequestException(
          'Only one address can be set as default.',
        );
      }
    }

    Object.assign(user, updateUserDto);

    try {
      return await user.save();
    } catch (error) {
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException(error.errors);
      }
      throw error;
    }
  }
}
