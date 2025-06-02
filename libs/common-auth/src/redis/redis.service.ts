// user-service/src/redis/redis.service.ts
import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) { }

    async set(key: string, value: string, ttlSeconds?: number): Promise<string | null> {
        if (ttlSeconds) {
            return this.redisClient.set(key, value, 'EX', ttlSeconds);
        }
        return this.redisClient.set(key, value);
    }

    async get(key: string): Promise<string | null> {
        return this.redisClient.get(key);
    }

    async del(key: string): Promise<number> {
        return this.redisClient.del(key);
    }

    async onModuleDestroy() {
        await this.redisClient.quit(); 
    }

    // Phương thức để truy cập trực tiếp client nếu cần
    getClient(): Redis {
        return this.redisClient;
    }
}