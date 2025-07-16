// user-service/src/auth/dto/register-user.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsString,
  IsPhoneNumber,
  IsIn,
} from 'class-validator';

export class RegisterUserDto {
  @IsEmail({}, { message: 'Email is not valid.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email: string;

  @IsNotEmpty({ message: 'Password cannot be empty.' })
  @MinLength(6, { message: 'Password must have at least 6 characters.' })
  @MaxLength(20, { message: 'Password must not exceed 20 characters.' })
  password: string;

  @IsNotEmpty({ message: 'Full Name cannot be empty' })
  @IsString({ message: 'Full Name must be string' })
  name: string;

  @IsNotEmpty({ message: 'Phone number cannot be empty.' })
  @IsPhoneNumber('VN', { message: 'Phone number is not valid.' })
  phone: string;

  @IsNotEmpty({ message: 'Role cannot be empty.' })
  @IsIn(['customer', 'admin'], {
    message: 'Role must be either customer or admin.',
  })
  role: 'customer' | 'admin';
}
