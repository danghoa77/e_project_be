// user-service/src/auth/guards/jwt-auth.guard.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            if (info && info.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Token has expired.');
            }
            if (info && info.name === 'JsonWebTokenError') {
                throw new UnauthorizedException('Token is not valid.');
            }
            throw err || new UnauthorizedException('You need to login to access.');
        }
        return user;
    }
}