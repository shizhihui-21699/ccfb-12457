import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // 开发时 ng serve (4200) 跨域调 API
  await app.listen(3000);
  console.log('访问复核平台后端已启动: http://localhost:3000');
}
bootstrap();
