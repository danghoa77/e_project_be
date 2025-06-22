// user-service/src/auth/guards/jwt-auth.guard.ts
// Check token valid or not
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    handleRequest<TUser = any>(
        err: any,
        user: TUser,
        info: any,
        context?: import('@nestjs/common').ExecutionContext,
        status?: any
    ): TUser | never {
        if (err || !user) {
            if (info?.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Token has expired.');
            }
            if (info?.name === 'JsonWebTokenError') {
                throw new UnauthorizedException('Token is not valid.');
            }
            throw err || new UnauthorizedException('You need to login to access.');
        }
        return user;
    }
}