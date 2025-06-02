// order-service/src/carts/carts.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from '../schemas/cart.schema';
import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';
import { HttpModule } from '@nestjs/axios';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
        HttpModule, // Để gọi Product Service
        RedisModule,
    ],
    controllers: [CartsController],
    providers: [CartsService],
    exports: [CartsService], // Export để OrdersService có thể sử dụng
})
export class CartsModule { }