// user-service/src/users/dto/update-user.dto.ts
import {
  IsString,
  IsOptional,
  IsPhoneNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

class AddressDto {

  @IsOptional()
  @IsString()
  _id?: string;

  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateUserDto {

  @IsString()
  @IsOptional()
  password?: string;

  @IsPhoneNumber('VN')
  @IsOptional()
  phone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  @IsOptional()
  addresses?: AddressDto[];
}
