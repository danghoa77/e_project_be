// order-service/src/carts/carts.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from '../schemas/cart.schema';
import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';
import { HttpModule } from '@nestjs/axios';
import { RedisModule } from '@app/common-auth';
import { CommonAuthModule } from '@app/common-auth';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
    HttpModule,
    RedisModule,
    CommonAuthModule,
  ],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartsModule {}
