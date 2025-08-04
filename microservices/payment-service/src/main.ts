// payment-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
      'ngrok-skip-browser-warning',
    ],
  });
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Payment Service running on port ${port}`);
}
bootstrap();