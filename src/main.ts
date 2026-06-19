import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)
  const port = configService.get<number>('PORT', 4000)
  const allowedOrigins = new Set(
    configService
      .get<string>(
        'BFF_ALLOWED_ORIGINS',
        [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:4000',
          'http://127.0.0.1:4000',
          'http://localhost:8081',
          'http://127.0.0.1:8081',
          'http://localhost:8090',
          'http://127.0.0.1:8090',
          'http://localhost:18083',
          'http://127.0.0.1:18083',
          'http://localhost:19006',
          'http://127.0.0.1:19006',
        ].join(','),
      )
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )

  app.enableCors({
    credentials: true,
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin not allowed'), false)
    },
  })
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))

  await app.listen(port)
}

void bootstrap()
