// order-service/src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../schemas/order.schema';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { HttpModule } from '@nestjs/axios';
import { RedisModule } from '@app/common-auth';
import { CartsModule } from '../carts/carts.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
        HttpModule, // Để gọi Product Service
        RedisModule, // Để lắng nghe Redis Stream và cache
        CartsModule, // Để sử dụng CartsService trong OrdersService
    ],
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [OrdersService], // Export nếu cần cho Payment Service cập nhật
})
export class OrdersModule { }