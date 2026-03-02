import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.fillter';
import { DB_POOL } from './database/database.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`PDF Utils API is running on http://localhost:${port}/api`);

  try {
    const pool = app.get<import('mysql2/promise').Pool>(DB_POOL);
    await pool.query('SELECT 1');
    console.log('DB 연결 확인됨');
  } catch (e) {
    console.error('DB 연결 확인 실패:', e);
  }
}
bootstrap();