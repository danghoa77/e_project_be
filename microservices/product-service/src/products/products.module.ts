// product-service/src/products/products.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product, ProductSchema } from '../schemas/product.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
        CloudinaryModule,
        RedisModule,
    ],
    controllers: [ProductsController],
    providers: [ProductsService],
    exports: [ProductsService], // Export nếu các service khác cần truy cập (ví dụ Order Service)
})
export class ProductsModule { }