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
import * as moment from "moment";
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly redisService: RedisService,
  ) { }

  async getAdmin1st(): Promise<User | null> {
    const user = this.userModel.findOne({ role: 'admin' }).select('+password').exec();
    console.log(user);
    return user
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
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
    const savedUser = await createdUser.save();

    await this.redisService.del(`user:${savedUser._id}`);
    return savedUser;
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

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException(`User with ID ${userId} not found.`);

    (["password", "phone"] as const).forEach(field => {
      if (dto[field]) user[field] = dto[field];
    });

    if (dto.addresses?.[0]) {
      const input = dto.addresses[0];
      const addresses = user.toObject().addresses || [];

      user.addresses = addresses.map(a => ({ ...a, isDefault: false }));

      if (input._id) {
        const id = input._id.toString();
        const idx = user.addresses.findIndex(a => a._id.toString() === id);
        if (idx === -1) throw new BadRequestException(`Address with ID ${id} not found.`);
        user.addresses[idx] = { ...user.addresses[idx], ...input, isDefault: true };
      } else {
        const { _id, ...rest } = input;
        user.addresses.push({ ...rest, isDefault: true } as any);
      }
    }


    try {
      const updatedUser = await user.save();
      await this.redisService.del(`user:${userId}`);
      return updatedUser;
    } catch (error) {
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException(error.errors);
      }
      throw error;
    }
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException(`User with ID ${userId} not found.`);

    const addr = user.addresses.find(a => a._id.toString() === addressId);
    if (!addr) throw new NotFoundException(`Address ${addressId} not found.`);
    if (addr.isDefault) throw new BadRequestException(`Cannot delete default address.`);

    user.addresses = user.addresses.filter(a => a._id.toString() !== addressId);

    await user.save();
    await this.redisService.del(`user:${userId}`);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userModel.findByIdAndDelete(userId);
    await this.redisService.del(`user:${userId}`);
  }

  async getUserDashboardStats() {
    const now = new Date();

    const startOfWeek = moment(now).startOf("isoWeek").toDate();
    const endOfWeek = moment(now).endOf("isoWeek").toDate();

    const startOfMonth = moment(now).startOf("month").toDate();
    const endOfMonth = moment(now).endOf("month").toDate();

    const [weekly, monthly, overview] = await Promise.all([
      this.userModel.aggregate([
        {
          $match: {
            role: "customer",
            createdAt: { $gte: startOfWeek, $lte: endOfWeek },
          },
        },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
          },
        },
      ]),

      this.userModel.aggregate([
        {
          $match: {
            role: "customer",
            createdAt: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
          },
        },
      ]),

      this.userModel.aggregate([
        { $match: { role: "customer" } },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      overview: overview[0] || { totalUsers: 0 },
      weekly: weekly[0] || { totalUsers: 0 },
      monthly: monthly[0] || { totalUsers: 0 },
    };
  }
}
