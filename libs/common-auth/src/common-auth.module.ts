// libs/common-auth/src/common-auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Import các Strategy từ thư mục 'strategies'
import { JwtStrategy } from './strategies/jwt.strategy';


// Import RedisModule từ thư mục 'redis'
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRATION_TIME') || '1h' },
      }),
      inject: [ConfigService],
    }),
    RedisModule,
  ],
  
  providers: [
    JwtStrategy,
  ],
  exports: [
    PassportModule,
    JwtModule,
    JwtStrategy,
    RedisModule,
  ],
})
export class CommonAuthModule { }