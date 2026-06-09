import { Args, Context, Mutation, Resolver } from '@nestjs/graphql'

import { AuthContext, AuthHttpService } from './auth-http.service'
import {
  AuthPayload,
  LoginInput,
  LogoutInput,
  RefreshSessionInput,
  SignUpInput,
} from './auth.models'
import { GatewayAuthResponse, GatewayClientService } from '../gateway-client/gateway-client.service'

@Resolver(() => AuthPayload)
export class AuthResolver {
  constructor(
    private readonly authHttpService: AuthHttpService,
    private readonly gatewayClient: GatewayClientService,
  ) {}

  @Mutation(() => AuthPayload)
  async login(
    @Args('input') input: LoginInput,
    @Context() context: AuthContext,
  ): Promise<AuthPayload> {
    this.authHttpService.assertCredentialRequest(context)
    const response = await this.gatewayClient.login(input.email, input.password)

    return this.toAuthPayload(context, response)
  }

  @Mutation(() => Boolean)
  async logout(
    @Args('input', { nullable: true, type: () => LogoutInput }) input: LogoutInput | null,
    @Context() context: AuthContext,
  ): Promise<boolean> {
    this.authHttpService.assertCredentialRequest(context)
    const refreshToken = this.authHttpService.getRefreshToken(context, input?.refreshToken)
    const response = await this.gatewayClient.logout(refreshToken)

    this.authHttpService.clearRefreshCookie(context)

    return response.ok
  }

  @Mutation(() => AuthPayload)
  async refreshSession(
    @Args('input', { nullable: true, type: () => RefreshSessionInput })
    input: RefreshSessionInput | null,
    @Context() context: AuthContext,
  ): Promise<AuthPayload> {
    this.authHttpService.assertCredentialRequest(context)
    const refreshToken = this.authHttpService.getRefreshToken(context, input?.refreshToken)
    const response = await this.gatewayClient.refreshSession(refreshToken)

    return this.toAuthPayload(context, response)
  }

  @Mutation(() => AuthPayload)
  async signUp(
    @Args('input') input: SignUpInput,
    @Context() context: AuthContext,
  ): Promise<AuthPayload> {
    this.authHttpService.assertCredentialRequest(context)
    const response = await this.gatewayClient.signUp(input.email, input.password, input.displayName)

    return this.toAuthPayload(context, response)
  }

  private toAuthPayload(context: AuthContext, response: GatewayAuthResponse): AuthPayload {
    if (this.authHttpService.shouldReturnRefreshTokenInBody(context)) {
      return {
        accessToken: response.accessToken,
        expiresIn: response.expiresIn,
        refreshToken: response.refreshToken,
        user: response.user,
      }
    }

    this.authHttpService.setRefreshCookie(context, response.refreshToken, response.refreshExpiresIn)

    return {
      accessToken: response.accessToken,
      expiresIn: response.expiresIn,
      refreshToken: null,
      user: response.user,
    }
  }
}
