import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { ClientGrpc } from '@nestjs/microservices'
import { firstValueFrom, Observable } from 'rxjs'

export type GatewayUser = {
  id: string
  email: string
  displayName: string
  role: string
}

export type GatewayAuthResponse = {
  accessToken: string
  expiresIn: number
  refreshExpiresIn: number
  refreshToken: string
  user: GatewayUser
}

export type GatewayAudioUploadSession = {
  audioAssetId: string
  bucket: string
  expiresAt: string
  expiresIn: number
  headers: Record<string, string>
  idempotencyKey: string
  method: string
  sourceObjectKey: string
  uploadUrl: string
}

type GatewayUserResponse = {
  id: string
  email: string
  displayName?: string
  display_name?: string
  role: string
}

type GatewayAuthGrpcResponse = {
  accessToken?: string
  access_token?: string
  expiresIn?: number
  expires_in?: number
  refreshExpiresIn?: number
  refresh_expires_in?: number
  refreshToken?: string
  refresh_token?: string
  user?: GatewayUserResponse
}

type GatewayAudioUploadSessionGrpcResponse = {
  audioAssetId?: string
  audio_asset_id?: string
  bucket?: string
  expiresAt?: string
  expires_at?: string
  expiresIn?: number
  expires_in?: number
  headers?: Record<string, string>
  idempotencyKey?: string
  idempotency_key?: string
  method?: string
  sourceObjectKey?: string
  source_object_key?: string
  uploadUrl?: string
  upload_url?: string
}

type GatewayGrpcService = {
  createAudioUploadSession(request: {
    accessToken?: string
    access_token?: string
    contentType?: string
    content_type?: string
    originalFilename?: string
    original_filename?: string
  }): Observable<GatewayAudioUploadSessionGrpcResponse>
  getCurrentUser(request: {
    accessToken?: string
    access_token?: string
  }): Observable<GatewayUserResponse>
  login(request: { email?: string; password?: string }): Observable<GatewayAuthGrpcResponse>
  logout(request: {
    refreshToken?: string
    refresh_token?: string
  }): Observable<{ ok?: boolean; status?: string }>
  refreshSession(request: {
    refreshToken?: string
    refresh_token?: string
  }): Observable<GatewayAuthGrpcResponse>
  signUp(request: {
    displayName?: string
    display_name?: string
    email?: string
    password?: string
  }): Observable<GatewayAuthGrpcResponse>
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

  async createAudioUploadSession(
    accessToken: string,
    originalFilename: string,
    contentType: string,
  ): Promise<GatewayAudioUploadSession> {
    const response = await firstValueFrom(
      this.gatewayService.createAudioUploadSession({
        access_token: accessToken,
        content_type: contentType,
        original_filename: originalFilename,
      }),
    )

    return {
      audioAssetId: response.audioAssetId ?? response.audio_asset_id ?? '',
      bucket: response.bucket ?? '',
      expiresAt: response.expiresAt ?? response.expires_at ?? '',
      expiresIn: response.expiresIn ?? response.expires_in ?? 0,
      headers: response.headers ?? {},
      idempotencyKey: response.idempotencyKey ?? response.idempotency_key ?? '',
      method: response.method ?? '',
      sourceObjectKey: response.sourceObjectKey ?? response.source_object_key ?? '',
      uploadUrl: response.uploadUrl ?? response.upload_url ?? '',
    }
  }

  async login(email: string, password: string): Promise<GatewayAuthResponse> {
    const response = await firstValueFrom(
      this.gatewayService.login({
        email,
        password,
      }),
    )

    return this.toGatewayAuthResponse(response)
  }

  async logout(refreshToken: string): Promise<{ ok: boolean; status: string }> {
    const response = await firstValueFrom(
      this.gatewayService.logout({
        refresh_token: refreshToken,
      }),
    )

    return {
      ok: response.ok ?? false,
      status: response.status ?? '',
    }
  }

  async refreshSession(refreshToken: string): Promise<GatewayAuthResponse> {
    const response = await firstValueFrom(
      this.gatewayService.refreshSession({
        refresh_token: refreshToken,
      }),
    )

    return this.toGatewayAuthResponse(response)
  }

  async signUp(email: string, password: string, displayName: string): Promise<GatewayAuthResponse> {
    const response = await firstValueFrom(
      this.gatewayService.signUp({
        display_name: displayName,
        email,
        password,
      }),
    )

    return this.toGatewayAuthResponse(response)
  }

  private toGatewayAuthResponse(response: GatewayAuthGrpcResponse): GatewayAuthResponse {
    if (!response.user) {
      throw new Error('Gateway returned an empty auth response')
    }

    return {
      accessToken: response.accessToken ?? response.access_token ?? '',
      expiresIn: response.expiresIn ?? response.expires_in ?? 0,
      refreshExpiresIn: response.refreshExpiresIn ?? response.refresh_expires_in ?? 0,
      refreshToken: response.refreshToken ?? response.refresh_token ?? '',
      user: {
        id: response.user.id,
        email: response.user.email,
        displayName: response.user.displayName ?? response.user.display_name ?? '',
        role: response.user.role,
      },
    }
  }
}
