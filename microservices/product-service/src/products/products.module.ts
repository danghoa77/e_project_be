// product-service/src/products/products.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product, ProductSchema } from '../schemas/product.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { RedisModule } from '@app/common-auth';
import { CommonAuthModule } from '@app/common-auth';
@Module({
    imports: [
        CommonAuthModule,
        MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
        CloudinaryModule,
        RedisModule,
    ],
    controllers: [ProductsController],
    providers: [ProductsService],
    exports: [ProductsService],
})
export class ProductsModule { }