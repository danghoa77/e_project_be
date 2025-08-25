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

  async findUserById(id: string, forceRefresh = false): Promise<GetUserDto> {
    if (!forceRefresh) {
      const cachedUser = await this.redisService.get(`user:${id}`);
      if (cachedUser) {
        console.log('User data from Redis cache');
        return plainToClass(GetUserDto, JSON.parse(cachedUser));
      }
    }

    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User is not exist.');
    }

    const userDto = plainToClass(GetUserDto, user.toObject());
    await this.redisService.set(`user:${id}`, JSON.stringify(userDto), 60 * 5);
    return userDto;
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }
    const { addresses: addressUpdates, ...otherProfileUpdates } = updateUserDto;
    Object.assign(user, otherProfileUpdates);
    if (addressUpdates && addressUpdates.length > 0) {
      const addressInput = addressUpdates[0];

      let currentAddresses = user.toObject().addresses;

      if (addressInput._id) {
        const addressIdToUpdate = addressInput._id.toString();
        let isAddressFound = false;

        const updatedAddresses = currentAddresses.map(addr => {
          if (addr._id.toString() === addressIdToUpdate) {
            isAddressFound = true;
            return { ...addr, ...addressInput, isDefault: true };
          }
          return { ...addr, isDefault: false };
        });

        if (!isAddressFound) {
          throw new BadRequestException(`Address with ID ${addressIdToUpdate} not found in user's profile.`);
        }

        user.addresses = updatedAddresses as any;

      } else {
        currentAddresses.forEach(addr => (addr.isDefault = false));
        const newAddress = {
          street: addressInput.street,
          city: addressInput.city,
          isDefault: true,
        };

        user.addresses = [...currentAddresses, newAddress] as any;
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

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const addressToDelete = user.addresses.find(
      (addr) => addr._id.toString() === addressId
    );
    if (!addressToDelete) {
      throw new NotFoundException(`Address with ID ${addressId} not found in user's profile.`);
    }

    let updatedAddresses = user.addresses.filter(
      (addr) => addr._id.toString() !== addressId
    );
    if (addressToDelete.isDefault && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true;
    }
    user.addresses = updatedAddresses;

    try {
      await user.save();
      await this.redisService.del(`user:${userId}`);
    } catch (error) {
      console.error("Failed to save user after deleting address:", error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userModel.findByIdAndDelete(userId);
    await this.redisService.del(`user:${userId}`);
  }
}
