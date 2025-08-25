import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // @ts-ignore
  app.set('trust proxy', 1);

  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:3001')
    .split(',')
    .map((s) => s.trim());
  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  await app.listen(process.env.PORT ?? 3333);
}
bootstrap();
