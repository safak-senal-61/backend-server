import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth-routes";
import { setupVite, serveStatic, log } from "./vite";
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

const app = express();
app.use(express.json({ limit: '50mb' })); // Increased limit for large test results
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function bootstrap() {
  try {
    // Create NestJS application
    const nestApp = await NestFactory.create(AppModule);
    
    // Enable CORS
    nestApp.enableCors({
      origin: true,
      credentials: true,
    });
    
    // Add global validation pipe
    nestApp.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }));
    
    // Set global prefix for API routes
    nestApp.setGlobalPrefix('api');
    
    // Setup Swagger
    const config = new DocumentBuilder()
      .setTitle('Comprehensive NestJS API')
      .setDescription('Tam kapsamlı NestJS API - Auth, Chat, Video, Games, Social Features, Transactions')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('chat', 'Chat and messaging')
      .addTag('video', 'Video conferencing')
      .addTag('games', 'Games and gaming')
      .addTag('social', 'Social features')
      .addTag('transactions', 'Payment and transactions')
      .addTag('notifications', 'Notifications')
      .addTag('admin', 'Admin panel')
      .build();
      
    const document = SwaggerModule.createDocument(nestApp, config);
    SwaggerModule.setup('api/docs', nestApp, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    
    // Setup Express for frontend serving in development
    if (process.env.NODE_ENV === 'development') {
      // Setup our custom Express routes
      const server = await registerRoutes(app);
      
      // Setup Vite for frontend development
      await setupVite(app, server);
      
      // Start Express on port 5000 for frontend
      server.listen({
        port: 5000,
        host: "0.0.0.0",
        reusePort: true,
      });
      
      log(`🚀 Combined Server çalışıyor: http://localhost:5000`);
      log(`📚 Swagger Docs: Ayrı NestJS sunucusu üzerinden erişilebilir`);
      
      // Start NestJS on a separate port for API documentation
      await nestApp.listen(3001, '0.0.0.0');
      log(`🚀 NestJS API Server çalışıyor: http://localhost:3001`);
      log(`📚 Swagger Docs: http://localhost:3001/api/docs`);
    } else {
      // In production, start NestJS directly
      await nestApp.listen(5000, '0.0.0.0');
      console.log('🚀 NestJS Server çalışıyor: http://localhost:5000');
      console.log('📚 Swagger Docs: http://localhost:5000/api/docs');
    }
    
  } catch (error) {
    console.error('NestJS Application failed to start:', error);
    process.exit(1);
  }
}

bootstrap();
