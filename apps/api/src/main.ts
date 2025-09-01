import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as path from 'path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

function getOrigins(): (string | RegExp)[] {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:3000';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cookieParser());

  app.enableCors({
    origin: getOrigins(),
    credentials: true,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token'],
    exposedHeaders: [],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const csrfEnabled = process.env.CSRF_ENABLED === '1';
  const csrfCookie = process.env.CSRF_COOKIE_NAME || 'rb.csrf';
  if (csrfEnabled) {
    app.use((req: any, res: any, next: any) => {
      const method = (req.method || '').toUpperCase();
      const unsafe = ['POST','PUT','PATCH','DELETE'].includes(method);
      const url: string = req.path || req.url || '';
      const skip =
        url.startsWith('/health') ||
        url.startsWith('/version') ||
        url.startsWith('/auth/login') ||
        url.startsWith('/auth/register') ||
        url.startsWith('/auth/register-dev');

      if (!unsafe || skip) return next();

      const token = req.get('x-csrf-token');
      const cookie = req.cookies?.[csrfCookie];
      if (!cookie || !token || cookie !== token) {
        return res.status(403).json({ message: 'Invalid CSRF token' });
      }
      next();
    });
  }

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
