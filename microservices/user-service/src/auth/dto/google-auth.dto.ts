// src/auth/dto/google-auth.dto.ts

import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
    /**
     * The ID token received from Google Sign-In on the client-side.
     * @example "eyJhbGciOiJSUzI1NiIsImtpZCI6Im..."
     */
    @IsString()
    @IsNotEmpty()
    idToken: string;
}