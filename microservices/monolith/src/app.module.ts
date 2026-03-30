import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { Controller, Get } from '@nestjs/common';

// Common libs from monorepo paths
import { RedisModule, MailerModule, TalkjsModule } from '@app/common-auth';

// Feature Modules from existing microservices
import { UsersModule } from '../../user-service/src/users/users.module';
import { AuthModule } from '../../user-service/src/auth/auth.module';
import { TalkjsLocalModule as UserTalkjsLocalModule } from '../../user-service/src/talkjs/talkjs.module';
import { ProductsModule } from '../../product-service/src/products/products.module';
import { CloudinaryModule } from '../../product-service/src/cloudinary/cloudinary.module';
import { OrdersModule } from '../../order-service/src/orders/orders.module';
import { CartsModule } from '../../order-service/src/carts/carts.module';
import { PaymentsModule } from '../../payment-service/src/payments/payments.module';

@Controller()
export class AppController {
  @Get('health')
  healthCheck(): { status: string; service: string } {
    return { status: 'ok', service: 'monolith' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const user = encodeURIComponent(configService.get<string>('MONGO_USERNAME') || '');
        const pass = encodeURIComponent(configService.get<string>('MONGO_PASSWORD') || '');
        let host = configService.get<string>('MONGO_HOST');
        const db = configService.get<string>('MONGO_DATABASE');

        if (host?.includes('.mongodb.net')) {
          host = host.split(':')[0]; // Loại bỏ port nếu dùng Atlas
        }

        return {
          uri: `mongodb+srv://${user}:${pass}@${host}/${db}?retryWrites=true&w=majority&appName=Cluster0`,
        };
      },
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION_TIME'),
        },
      }),
      inject: [ConfigService],
      global: true,
    }),
    HttpModule,
    RedisModule,
    MailerModule,
    TalkjsModule,
    // Feature Modules
    UsersModule,
    AuthModule,
    UserTalkjsLocalModule,
    ProductsModule,
    CloudinaryModule,
    OrdersModule,
    CartsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [Logger],
})
export class AppMonolithModule {}
