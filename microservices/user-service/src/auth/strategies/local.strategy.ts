// user-service/src/auth/strategies/local.strategy.ts
//check password and email with local strategy
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) { // type "local"
    constructor(private authService: AuthService) {
        super({
            usernameField: 'email',
            passwordField: 'password',
        });
    }

    async validate(_id: string, email: string, password: string): Promise<any> {
        const user = await this.authService.validateUser(_id, email, password);
        if (!user) {
            throw new UnauthorizedException('Email or Password is not correct.');
        }
        return user;
    }
}