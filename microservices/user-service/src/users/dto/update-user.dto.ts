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
import { Type } from 'class-transformer';


class AddressDto {
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
    @MaxLength(50)
    name?: string;

    @IsPhoneNumber('VN') 
    @IsOptional()
    phone?: string;

    @IsArray()
    @ValidateNested({ each: true }) 
    @Type(() => AddressDto)   
    @IsOptional()
    addresses?: AddressDto[];
    }