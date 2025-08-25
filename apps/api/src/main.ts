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

  const server = app.getHttpAdapter().getInstance();
  (server as any).set('trust proxy', 1);

  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:3001')
    .split(',')
    .map((s) => s.trim());
  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  server.get('/health', (req: any, res: any) => {
    res.status(200).json({ ok: true });
  });

  server.get('/version', (req: any, res: any) => {
    res.status(200).json({
      version: process.env.RELIABILL_VERSION ?? 'dev',
      commit: process.env.GIT_COMMIT ?? 'local',
      time: new Date().toISOString(),
    });
  });

  await app.listen(process.env.PORT ?? 3333);
}
bootstrap();
