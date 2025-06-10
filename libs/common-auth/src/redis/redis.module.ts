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

                const redisUrl = configService.get<string>('REDIS_URL');
                if (!redisUrl) {
                    throw new Error('REDIS_URL is not defined in environment variables');
                }

                const Redis = await import('ioredis');

                const redisClient = new Redis.Redis(redisUrl);

                redisClient.on('error', (err) => console.error('Redis Client Error', err));
                redisClient.on('connect', () => console.log('Redis Connected'));

                return redisClient;
            },
            inject: [ConfigService],
        },
        RedisService,
    ],
    exports: [RedisService],
})
export class RedisModule { }
