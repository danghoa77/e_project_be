// src/auth/types/auth.types.ts

export interface AuthenticatedUser {
    userId: string;
    email: string;
    role: string;
}
export interface GooglePassportUser {
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
    accessToken: string; 
    googleId: string;
}