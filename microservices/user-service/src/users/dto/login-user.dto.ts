/* eslint-disable prettier/prettier */
// user-service/src/auth/dto/login-user.dto.ts
import { IsEmail, IsMongoId, IsNotEmpty } from 'class-validator';

export class LoginUserDto {
  _id?: string;

  @IsEmail({}, { message: 'Email is not valid.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email: string;

  @IsNotEmpty({ message: 'Password cannot be empty.' })
  password: string;

  role?: string;
}
