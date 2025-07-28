// src/auth/types/auth.types.ts

// Dùng cho req.user sau khi đã qua JwtAuthGuard
export interface AuthenticatedUser {
    userId: string;
    email: string;
    role: string;
}

// Dùng cho req.user sau khi đã qua Google's Passport strategy
export interface GooglePassportUser {
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
    accessToken: string; // Token từ Google, không phải token của hệ thống mình
    googleId: string;
}