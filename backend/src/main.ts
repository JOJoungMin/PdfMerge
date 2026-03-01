import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.use(requestIdMiddleware);
  app.setGlobalPrefix('api')
  app.enableCors({
    origin: true,
    credentials: true,
  });
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`PDF Utils API is running on http://localhost:${port}/api`);
  
}
bootstrap();