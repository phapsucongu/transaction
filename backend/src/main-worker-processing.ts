import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ProcessingWorkerService } from './module/processing/processing-worker.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const worker = app.get(ProcessingWorkerService);

  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await app.close();
    process.exit(0);
  });

  await worker.start();
}

bootstrap();