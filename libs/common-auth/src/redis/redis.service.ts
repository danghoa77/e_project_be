import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);

    constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) { }

    async set(key: string, value: string, ttlSeconds?: number): Promise<string | null> {
        this.logger.log(`SET key=${key} value=${value} ttl=${ttlSeconds ?? 'no ttl'}`);
        if (ttlSeconds) {
            return this.redisClient.set(key, value, 'EX', ttlSeconds);
        }
        return this.redisClient.set(key, value);
    }

    async get(key: string): Promise<string | null> {
        this.logger.log(`GET key=${key}`);
        return this.redisClient.get(key);
    }

    async del(key: string): Promise<number> {
        this.logger.log(`DEL key=${key}`);
        return this.redisClient.del(key);
    }

    async onModuleDestroy() {
        this.logger.log('Disconnecting Redis client');
        await this.redisClient.quit();
    }

    // Phương thức để truy cập trực tiếp client nếu cần
    getClient(): Redis {
        return this.redisClient;
    }
}
