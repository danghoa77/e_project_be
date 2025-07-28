// user-service/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  // app.enableCors({
  //   origin: 'http://localhost:3000', // Frontend URL
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  //   credentials: true,
  //   allowedHeaders: 'Content-Type, Accept, Authorization, X-CSRF-Token',
  // });
  app.enableCors({
    origin: true, // hoặc '*'
    methods: '*',
    credentials: true,
    allowedHeaders: '*',
  });
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`User Service running on port ${port}`);
}
void bootstrap();
