import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { ClientGrpc } from '@nestjs/microservices'
import { firstValueFrom, Observable } from 'rxjs'

export type GatewayUser = {
  id: string
  email: string
  displayName: string
  role: string
}

type GatewayUserResponse = {
  id: string
  email: string
  displayName?: string
  display_name?: string
  role: string
}

type GatewayGrpcService = {
  getCurrentUser(request: {
    accessToken?: string
    access_token?: string
  }): Observable<GatewayUserResponse>
}

@Injectable()
export class GatewayClientService implements OnModuleInit {
  private gatewayService!: GatewayGrpcService

  constructor(@Inject('GATEWAY_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.gatewayService = this.client.getService<GatewayGrpcService>('GatewayService')
  }

  async getCurrentUser(accessToken: string): Promise<GatewayUser> {
    const user = await firstValueFrom(
      this.gatewayService.getCurrentUser({ access_token: accessToken }),
    )

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? user.display_name ?? '',
      role: user.role,
    }
  }
}
