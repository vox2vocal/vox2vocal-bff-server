import { ConfigService } from '@nestjs/config'

import { AudioUploadResolver } from '../../src/audio-upload/audio-upload.resolver'
import { AuthContext, AuthHttpService } from '../../src/auth/auth-http.service'
import {
  GatewayAudioUploadSession,
  GatewayClientService,
} from '../../src/gateway-client/gateway-client.service'

class TestConfigService {
  constructor(private readonly values: Record<string, string | undefined> = {}) {}

  get<T = string>(key: string, defaultValue?: T): T {
    return (this.values[key] ?? defaultValue) as T
  }
}

const uploadSession: GatewayAudioUploadSession = {
  audioAssetId: 'aud_123',
  bucket: 'vox2vocal-audio-assets',
  expiresAt: '2026-06-10T00:15:00.000Z',
  expiresIn: 900,
  headers: {
    'content-type': 'audio/mpeg',
  },
  idempotencyKey: 'upload-session-123',
  method: 'PUT',
  sourceObjectKey: 'audio-assets/aud_123/original/input.mp3',
  uploadUrl:
    'http://localhost:19000/vox2vocal-audio-assets/audio-assets/aud_123/original/input.mp3',
}

const createResolver = () => {
  const gatewayClient = {
    createAudioUploadSession: jest.fn().mockResolvedValue(uploadSession),
  }
  const authHttpService = new AuthHttpService(
    new TestConfigService({
      BFF_ALLOWED_ORIGINS: 'https://app.vox2vocal.com',
    }) as unknown as ConfigService,
  )

  return {
    gatewayClient,
    resolver: new AudioUploadResolver(
      authHttpService,
      gatewayClient as unknown as GatewayClientService,
    ),
  }
}

const createWebContext = (): AuthContext => ({
  req: {
    headers: {
      authorization: 'Bearer access.token',
      origin: 'https://app.vox2vocal.com',
      'x-vox2vocal-csrf': '1',
    },
  },
})

describe('AudioUploadResolver', () => {
  it('creates an audio upload session through the API Gateway', async () => {
    const { gatewayClient, resolver } = createResolver()

    await expect(
      resolver.createAudioUploadSession(
        {
          contentType: 'audio/mpeg',
          originalFilename: 'input.mp3',
        },
        createWebContext(),
      ),
    ).resolves.toEqual({
      audioAssetId: 'aud_123',
      bucket: 'vox2vocal-audio-assets',
      expiresAt: '2026-06-10T00:15:00.000Z',
      expiresIn: 900,
      headers: [{ name: 'content-type', value: 'audio/mpeg' }],
      idempotencyKey: 'upload-session-123',
      method: 'PUT',
      sourceObjectKey: 'audio-assets/aud_123/original/input.mp3',
      uploadUrl:
        'http://localhost:19000/vox2vocal-audio-assets/audio-assets/aud_123/original/input.mp3',
    })
    expect(gatewayClient.createAudioUploadSession).toHaveBeenCalledWith(
      'access.token',
      'input.mp3',
      'audio/mpeg',
    )
  })

  it('rejects browser upload session mutations without CSRF protection', async () => {
    const { resolver } = createResolver()

    await expect(
      resolver.createAudioUploadSession(
        {
          contentType: 'audio/mpeg',
          originalFilename: 'input.mp3',
        },
        {
          req: {
            headers: {
              authorization: 'Bearer access.token',
              origin: 'https://app.vox2vocal.com',
            },
          },
        },
      ),
    ).rejects.toThrow('FORBIDDEN')
  })
})
