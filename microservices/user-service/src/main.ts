// user-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:3000', // Frontend URL, thay đổi khi deploy
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Cho phép gửi cookies, authorization headers
    allowedHeaders: 'Content-Type, Accept, Authorization, X-CSRF-Token', // Đảm bảo X-CSRF-Token được phép
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Loại bỏ các thuộc tính không có trong DTO
    forbidNonWhitelisted: true, // Báo lỗi nếu có thuộc tính không hợp lệ
    transform: true, // Tự động chuyển đổi kiểu dữ liệu cho DTO
  }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`User Service running on port ${port}`);
}
bootstrap();