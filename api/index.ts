import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { SanitizePipe } from '../src/common/pipes/sanitize.pipe';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const express = require('express');

const server = express();
let bootstrapError: unknown;

const ready = (async () => {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn'],
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Institute-Id'],
  });

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();
})().catch((e) => {
  bootstrapError = e;
  console.error('[bootstrap] failed:', e);
});

export default async function handler(req: any, res: any) {
  await ready;
  if (bootstrapError) {
    res.status(500).json({ error: 'Bootstrap failed', detail: String(bootstrapError) });
    return;
  }
  server(req, res);
}
