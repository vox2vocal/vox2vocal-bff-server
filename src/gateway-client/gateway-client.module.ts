import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { join } from 'node:path'

import { GatewayClientService } from './gateway-client.service'

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'GATEWAY_PACKAGE',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'gateway',
            protoPath: join(process.cwd(), 'proto/gateway.proto'),
            url: configService.get<string>('API_GATEWAY_GRPC_URL', 'localhost:50050'),
          },
        }),
      },
    ]),
  ],
  providers: [GatewayClientService],
  exports: [GatewayClientService],
})
export class GatewayClientModule {}
