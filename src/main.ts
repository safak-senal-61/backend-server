import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // CORS configuration
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5000'],
    credentials: true,
  });

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Chat & Video Conference API')
    .setDescription(`
🚀 **Gerçek Zamanlı Chat ve Video Konferans API'si**

Bu API, kullanıcılar arasında anlık mesajlaşma, video konferans odaları, oyun entegrasyonu ve sosyal etkileşim özellikleri sağlar.

## 🔑 Ana Özellikler
- **Kullanıcı Yönetimi**: Kayıt, giriş, profil yönetimi
- **Chat Sistemi**: Gerçek zamanlı mesajlaşma, oda yönetimi
- **Video Konferans**: Video odaları oluşturma ve katılma
- **Oyun Entegrasyonu**: Oyun oturumları ve puanlama
- **Sosyal Özellikler**: Takip sistemi, hediye gönderme
- **İçerik Moderasyonu**: Şikayet ve moderasyon sistemi
- **Canlı Yayın**: Stream oluşturma ve yönetimi

## 🛡️ Güvenlik
- JWT tabanlı kimlik doğrulama
- İki faktörlü doğrulama (2FA)
- Rate limiting ve CORS koruması
- Güvenilir cihaz yönetimi

## 📊 İstatistikler ve Analitik
- Kullanıcı aktivite takibi
- Oyun performans metrikleri
- Chat ve video kullanım analizi
    `)
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'JWT token giriniz',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Kullanıcı kimlik doğrulama işlemleri')
    .addTag('Users', 'Kullanıcı yönetimi ve profil işlemleri')
    .addTag('Chat', 'Mesajlaşma ve chat odası işlemleri')
    .addTag('Video Conference', 'Video konferans oda yönetimi')
    .addTag('Games', 'Oyun ve oyun oturumu yönetimi')
    .addTag('Social', 'Takip sistemi ve sosyal etkileşimler')
    .addTag('Transactions', 'Coin ve para işlemleri')
    .addTag('Notifications', 'Bildirim yönetimi')
    .addTag('Reports', 'Şikayet ve moderasyon sistemi')
    .addTag('Streams', 'Canlı yayın işlemleri')
    .addTag('Admin', 'Yönetici işlemleri ve sistem yönetimi')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Chat & Video API Docs',
    customfavIcon: 'https://docs.nestjs.com/assets/logo-small.svg',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #e53e3e; font-size: 2rem; }
      .swagger-ui .info .description { font-size: 1.1rem; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  });

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 NestJS Server çalışıyor: http://localhost:${port}`);
  console.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
}

bootstrap();