import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = Number(process.env.PORT ?? 3333);
  await app.listen(port);
}

void bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
