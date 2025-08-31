import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as path from 'path';

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

  server.get('/health', (_req: any, res: any) => {
    res.status(200).json({ ok: true });
  });

  server.get('/version', (_req: any, res: any) => {
    res.status(200).json({
      version: process.env.RELIABILL_VERSION ?? 'dev',
      commit: process.env.GIT_COMMIT ?? 'local',
      time: new Date().toISOString(),
    });
  });

  const docsDir = process.env.DOCS_DIR || path.resolve(process.cwd(), 'storage');
  console.log('[BOOT] Writing docs under:', docsDir);

  await app.listen(process.env.PORT ?? 3333);
}
bootstrap();
