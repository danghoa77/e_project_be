// user-service/src/auth/dto/login-user.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginUserDto {
    @IsEmail({}, { message: 'Email is not valid.' })
    @IsNotEmpty({ message: 'Email cannot be empty.' })
    email: string;

    @IsNotEmpty({ message: 'Password cannot be empty.' })
    password: string;
}