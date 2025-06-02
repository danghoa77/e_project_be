// payment-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsModule } from './payments/payments.module';
import { RedisModule } from './redis/redis.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: `mongodb+srv://${configService.get<string>('MONGO_USERNAME')}:${configService.get<string>('MONGO_PASSWORD')}@${configService.get<string>('MONGO_HOST')}/${configService.get<string>('MONGO_DATABASE')}?retryWrites=true&w=majority&appName=Cluster0`,
      }),
      inject: [ConfigService],
    }),

    PaymentsModule,
    RedisModule,
    HttpModule, // Cần để gọi Order Service nếu muốn lấy thông tin Order trước khi tạo Payment
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }