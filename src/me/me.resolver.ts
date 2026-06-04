import { Query, Resolver, Context } from '@nestjs/graphql'

import { GatewayClientService } from '../gateway-client/gateway-client.service'
import { UserModel } from './user.model'

@Resolver(() => UserModel)
export class MeResolver {
  constructor(private readonly gatewayClient: GatewayClientService) {}

  @Query(() => UserModel)
  async me(@Context('req') request: { headers?: { authorization?: string } }): Promise<UserModel> {
    const authorization = request.headers?.authorization
    const accessToken = authorization?.replace(/^Bearer\s+/i, '') ?? ''
    const user = await this.gatewayClient.getCurrentUser(accessToken)

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    }
  }
}
