import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

function formatValidationErrors(errors: ValidationError[]): string {
  const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));

  return messages.length > 0 ? messages.join(', ') : 'Validation failed.';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get('CORS_ORIGIN'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = configService.get('PORT') || 3000;
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          statusCode: 400,
          message: formatValidationErrors(errors),
          error: 'Bad Request',
        }),
    }),
  );

  await app.listen(port);
}
bootstrap();
