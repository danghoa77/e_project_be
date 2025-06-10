// product-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsModule } from './products/products.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { RedisModule } from '@app/common-auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: `mongodb+srv://${configService.get<string>('MONGO_USERNAME')}:${configService.get<string>('MONGO_PASSWORD')}@${configService.get<string>('MONGO_HOST')}/${configService.get<string>('MONGO_DATABASE')}?retryWrites=true&w=majority`
      }),
      inject: [ConfigService],

    }),
    ProductsModule,
    CloudinaryModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],

})

export class AppModule { }