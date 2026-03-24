import 'dotenv/config';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { WinstonLoggerService } from './common/logger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  // Trigger restart: 2
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Serve uploaded static files (avatars, documents, etc.)
  // Files stored in: apps/api/uploads/  → accessible at: /uploads/**
  const express = app.getHttpAdapter().getInstance();
  express.use('/uploads', require('express').static(path.join(process.cwd(), 'uploads')));

  // Use custom logger
  const logger = app.get(WinstonLoggerService);
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields
      forbidNonWhitelisted: false,
      transform: true, // auto-transform types
    }),
  );

  // CORS
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow local development origins (localhost, 127.0.0.1, and generic LAN IPs)
      const allowedOrigins = [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Common home/office LAN
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/, // Enterprise LAN
        /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:\d+$/, // Docker/VPN ranges
        /^https?:\/\/([a-zA-Z0-9-]+\.)*sunplast\.vn(:\d+)?$/, // sunplast.vn and subdomains
      ];

      const isAllowed = allowedOrigins.some((regex) => regex.test(origin));

      if (isAllowed || origin === process.env.CORS_ORIGIN) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger Documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('eOffice API')
      .setDescription('Enterprise Office Management System API Documentation')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Employees', 'Employee management')
      .addTag('Departments', 'Department management')
      .addTag('Leaves', 'Leave request management')
      .addTag('Bookings', 'Room booking management')
      .addTag('Documents', 'Document management')
      .addTag('Health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log('Swagger docs available at /api/docs', 'Bootstrap');
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(`Application running on port ${port}`, 'Bootstrap');
}

bootstrap();
