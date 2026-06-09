import { Args, Context, Mutation, Resolver } from '@nestjs/graphql'

import { AudioUploadSession, CreateAudioUploadSessionInput } from './audio-upload.models'
import { AuthContext, AuthHttpService } from '../auth/auth-http.service'
import {
  GatewayAudioUploadSession,
  GatewayClientService,
} from '../gateway-client/gateway-client.service'

@Resolver(() => AudioUploadSession)
export class AudioUploadResolver {
  constructor(
    private readonly authHttpService: AuthHttpService,
    private readonly gatewayClient: GatewayClientService,
  ) {}

  @Mutation(() => AudioUploadSession)
  async createAudioUploadSession(
    @Args('input') input: CreateAudioUploadSessionInput,
    @Context() context: AuthContext,
  ): Promise<AudioUploadSession> {
    this.authHttpService.assertCredentialRequest(context)
    const accessToken = this.getBearerAccessToken(context)
    const session = await this.gatewayClient.createAudioUploadSession(
      accessToken,
      input.originalFilename,
      input.contentType,
    )

    return this.toAudioUploadSession(session)
  }

  private getBearerAccessToken(context: AuthContext): string {
    const headers = context.req?.headers ?? {}
    const authorization = headers.authorization ?? headers.Authorization ?? ''
    const value = Array.isArray(authorization) ? (authorization[0] ?? '') : authorization

    return value.replace(/^Bearer\s+/i, '')
  }

  private toAudioUploadSession(session: GatewayAudioUploadSession): AudioUploadSession {
    return {
      audioAssetId: session.audioAssetId,
      bucket: session.bucket,
      expiresAt: session.expiresAt,
      expiresIn: session.expiresIn,
      headers: Object.entries(session.headers).map(([name, value]) => ({ name, value })),
      idempotencyKey: session.idempotencyKey,
      method: session.method,
      sourceObjectKey: session.sourceObjectKey,
      uploadUrl: session.uploadUrl,
    }
  }
}
