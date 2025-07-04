// user-service/src/redis/redis.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const Redis = await import('ioredis');
        const redisClient = new Redis.Redis({
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_PASSWORD'),
        });

        redisClient.on('error', (err) =>
          console.error('Redis Client Error', err),
        );
        redisClient.on('connect', () => console.log('Redis Connected'));

        return redisClient;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService], // Export RedisService
})
export class RedisModule {}
