import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OutboxWorkerService } from './module/outbox/outbox-worker.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const worker = app.get(OutboxWorkerService);

  process.on('SIGINT', async () => {
    worker.stop();
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    worker.stop();
    await app.close();
    process.exit(0);
  });

  await worker.start();
}

bootstrap();