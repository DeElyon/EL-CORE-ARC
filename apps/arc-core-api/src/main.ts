import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Swagger Setup for independent frontend teams
  const config = new DocumentBuilder()
    .setTitle('ARC CORE API')
    .setDescription('Unified Backend for EL VERSE')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.enableCors(); // Allow all EL VERSE frontends to connect
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`ARC CORE is running on: ${await app.getUrl()}`);
}

bootstrap();
