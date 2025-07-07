// libs/common-auth/src/common-auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RedisModule } from './redis/redis.module';
import { TalkjsModule } from './talkjs/talkjs.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthService } from './auth-providers/google-auth.service';
@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION_TIME') || '1h',
        },
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    TalkjsModule,
  ],

  providers: [JwtStrategy, GoogleStrategy,
    GoogleAuthService,],
  exports: [PassportModule, JwtModule, JwtStrategy, RedisModule, TalkjsModule, GoogleAuthService],
})
export class CommonAuthModule { }
