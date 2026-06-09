import { ConfigService } from '@nestjs/config'

import { AuthContext, AuthHttpService } from '../../src/auth/auth-http.service'
import { AuthResolver } from '../../src/auth/auth.resolver'
import {
  GatewayAuthResponse,
  GatewayClientService,
} from '../../src/gateway-client/gateway-client.service'

class TestConfigService {
  constructor(private readonly values: Record<string, string | undefined> = {}) {}

  get<T = string>(key: string, defaultValue?: T): T {
    return (this.values[key] ?? defaultValue) as T
  }
}

const authResponse: GatewayAuthResponse = {
  accessToken: 'access.token',
  expiresIn: 900,
  refreshExpiresIn: 604800,
  refreshToken: 'refresh.token',
  user: {
    id: 'user-1',
    email: 'user@example.com',
    displayName: 'User',
    role: 'USER',
  },
}

const createResolver = () => {
  const gatewayClient = {
    login: jest.fn().mockResolvedValue(authResponse),
    logout: jest.fn().mockResolvedValue({ ok: true, status: 'LOGGED_OUT' }),
    refreshSession: jest.fn().mockResolvedValue(authResponse),
    signUp: jest.fn().mockResolvedValue(authResponse),
  }
  const authHttpService = new AuthHttpService(
    new TestConfigService({
      BFF_ALLOWED_ORIGINS: 'https://app.vox2vocal.com',
    }) as unknown as ConfigService,
  )

  return {
    gatewayClient,
    resolver: new AuthResolver(authHttpService, gatewayClient as unknown as GatewayClientService),
  }
}

const createWebContext = (headers: Record<string, string> = {}): AuthContext => ({
  req: {
    headers: {
      origin: 'https://app.vox2vocal.com',
      'x-vox2vocal-csrf': '1',
      ...headers,
    },
  },
  res: {
    setHeader: jest.fn(),
  },
})

const createNativeContext = (): AuthContext => ({
  req: {
    headers: {
      'x-vox2vocal-client': 'native',
    },
  },
  res: {
    setHeader: jest.fn(),
  },
})

describe('AuthResolver', () => {
  it('sets refresh token cookies for web login without returning refresh token in the body', async () => {
    const { gatewayClient, resolver } = createResolver()
    const context = createWebContext()

    const payload = await resolver.login(
      {
        email: 'user@example.com',
        password: 'password123',
      },
      context,
    )

    expect(gatewayClient.login).toHaveBeenCalledWith('user@example.com', 'password123')
    expect(payload).toMatchObject({
      accessToken: 'access.token',
      expiresIn: 900,
      refreshToken: null,
      user: authResponse.user,
    })
    expect(context.res?.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.arrayContaining([expect.stringContaining('vox2vocal_refresh_token=refresh.token')]),
    )
  })

  it('returns refresh token in the body for trusted native login requests', async () => {
    const { resolver } = createResolver()
    const context = createNativeContext()

    const payload = await resolver.login(
      {
        email: 'user@example.com',
        password: 'password123',
      },
      context,
    )

    expect(payload.refreshToken).toBe('refresh.token')
    expect(context.res?.setHeader).not.toHaveBeenCalled()
  })

  it('rejects browser credential mutations without CSRF protection', async () => {
    const { resolver } = createResolver()

    await expect(
      resolver.login(
        {
          email: 'user@example.com',
          password: 'password123',
        },
        createWebContext({
          'x-vox2vocal-csrf': '',
        }),
      ),
    ).rejects.toThrow('FORBIDDEN')
  })

  it('refreshes web sessions from the refresh cookie and rotates the cookie', async () => {
    const { gatewayClient, resolver } = createResolver()
    const context = createWebContext({
      cookie: 'vox2vocal_refresh_token=old.refresh',
    })

    const payload = await resolver.refreshSession(null, context)

    expect(gatewayClient.refreshSession).toHaveBeenCalledWith('old.refresh')
    expect(payload.refreshToken).toBeNull()
    expect(context.res?.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.arrayContaining([expect.stringContaining('vox2vocal_refresh_token=refresh.token')]),
    )
  })

  it('logs native sessions out with the explicit refresh token input', async () => {
    const { gatewayClient, resolver } = createResolver()
    const context = createNativeContext()

    await expect(resolver.logout({ refreshToken: 'native.refresh' }, context)).resolves.toBe(true)

    expect(gatewayClient.logout).toHaveBeenCalledWith('native.refresh')
  })

  it('clears the refresh cookie when web logout succeeds', async () => {
    const { resolver } = createResolver()
    const context = createWebContext({
      cookie: 'vox2vocal_refresh_token=old.refresh',
    })

    await expect(resolver.logout(null, context)).resolves.toBe(true)

    expect(context.res?.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.arrayContaining([expect.stringContaining('Max-Age=0')]),
    )
  })
})
