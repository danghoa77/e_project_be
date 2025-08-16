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

    // Tách riêng phần xử lý địa chỉ khỏi các cập nhật thông tin cá nhân khác
    const { addresses: addressUpdates, ...otherProfileUpdates } = updateUserDto;

    // 1. Cập nhật các trường thông tin khác (ví dụ: name, phone)
    Object.assign(user, otherProfileUpdates);

    // 2. Xử lý logic cho địa chỉ nếu có trong DTO
    if (addressUpdates && addressUpdates.length > 0) {
      // API nên được thiết kế để chỉ xử lý một địa chỉ mỗi lần gọi (thêm mới hoặc cập nhật)
      // để logic được đơn giản và rõ ràng.
      const addressInput = addressUpdates[0];

      // Lấy danh sách địa chỉ hiện tại ra để làm việc
      // Chuyển toàn bộ đối tượng user sang plain object, bao gồm cả mảng addresses
      let currentAddresses = user.toObject().addresses;

      if (addressInput._id) {
        // --- KỊCH BẢN A: CẬP NHẬT MỘT ĐỊA CHỈ ĐÃ TỒN TẠI ---
        // Người dùng muốn cập nhật thông tin hoặc đặt một địa chỉ cũ làm mặc định.
        const addressIdToUpdate = addressInput._id.toString();
        let isAddressFound = false;

        // Dùng map để tạo mảng địa chỉ mới
        const updatedAddresses = currentAddresses.map(addr => {
          if (addr._id.toString() === addressIdToUpdate) {
            isAddressFound = true;
            // Kết hợp thông tin cập nhật và đảm bảo nó là địa chỉ mặc định
            return { ...addr, ...addressInput, isDefault: true };
          }
          // Đảm bảo tất cả các địa chỉ khác không phải là mặc định
          return { ...addr, isDefault: false };
        });

        if (!isAddressFound) {
          throw new BadRequestException(`Address with ID ${addressIdToUpdate} not found in user's profile.`);
        }

        user.addresses = updatedAddresses as any;

      } else {
        // --- KỊCH BẢN B: THÊM MỘT ĐỊA CHỈ MỚI ---
        // Đặt tất cả địa chỉ hiện có thành không phải mặc định
        currentAddresses.forEach(addr => (addr.isDefault = false));

        // Tạo địa chỉ mới, đảm bảo nó là mặc định
        const newAddress = {
          street: addressInput.street,
          city: addressInput.city,
          isDefault: true, // Địa chỉ mới luôn là mặc định
        };

        // Thêm địa chỉ mới vào danh sách đã được cập nhật
        user.addresses = [...currentAddresses, newAddress] as any;
      }
    }

    // 3. Lưu lại tất cả thay đổi vào database
    try {
      const updatedUser = await user.save();
      // Xóa cache Redis để đảm bảo dữ liệu mới nhất được lấy vào lần sau
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
    // 1. Tìm người dùng bằng ID
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const addressToDelete = user.addresses.find(
      (addr) => addr._id.toString() === addressId
    );

    // 2. Kiểm tra xem địa chỉ có tồn tại trong danh sách của người dùng không
    if (!addressToDelete) {
      throw new NotFoundException(`Address with ID ${addressId} not found in user's profile.`);
    }

    // 3. Lọc ra địa chỉ cần xóa
    let updatedAddresses = user.addresses.filter(
      (addr) => addr._id.toString() !== addressId
    );

    // 4. Xử lý trường hợp đặc biệt: Nếu địa chỉ bị xóa là mặc định
    // và vẫn còn các địa chỉ khác, hãy đặt địa chỉ đầu tiên trong danh sách
    // còn lại làm mặc định mới.
    if (addressToDelete.isDefault && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true;
    }

    // 5. Gán lại mảng địa chỉ đã cập nhật cho người dùng
    user.addresses = updatedAddresses;

    // 6. Lưu thay đổi và xóa cache
    try {
      await user.save();
      await this.redisService.del(`user:${userId}`);
    } catch (error) {
      // Ném lỗi nếu quá trình lưu gặp sự cố
      console.error("Failed to save user after deleting address:", error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userModel.findByIdAndDelete(userId);
    await this.redisService.del(`user:${userId}`);
  }
}
