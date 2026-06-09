import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { AuthContext, AuthHttpService } from '../../src/auth/auth-http.service'

class TestConfigService {
  constructor(private readonly values: Record<string, string | undefined> = {}) {}

  get<T = string>(key: string, defaultValue?: T): T {
    return (this.values[key] ?? defaultValue) as T
  }
}

const createService = (values?: Record<string, string | undefined>) =>
  new AuthHttpService(new TestConfigService(values) as unknown as ConfigService)

const webContext = (headers: Record<string, string> = {}): AuthContext => ({
  req: {
    headers,
  },
})

describe('AuthHttpService', () => {
  it('allows credential web requests only with CSRF and an allowlisted origin', () => {
    const service = createService({
      BFF_ALLOWED_ORIGINS: 'https://app.vox2vocal.com',
    })

    expect(() =>
      service.assertCredentialRequest(
        webContext({
          origin: 'https://app.vox2vocal.com',
          'x-vox2vocal-csrf': '1',
        }),
      ),
    ).not.toThrow()
  })

  it('rejects web credential requests missing the CSRF header', () => {
    const service = createService({
      BFF_ALLOWED_ORIGINS: 'https://app.vox2vocal.com',
    })

    expect(() =>
      service.assertCredentialRequest(
        webContext({
          origin: 'https://app.vox2vocal.com',
        }),
      ),
    ).toThrow(ForbiddenException)
  })

  it('rejects web credential requests from non-allowlisted origins', () => {
    const service = createService({
      BFF_ALLOWED_ORIGINS: 'https://app.vox2vocal.com',
    })

    expect(() =>
      service.assertCredentialRequest(
        webContext({
          origin: 'https://evil.example',
          'x-vox2vocal-csrf': '1',
        }),
      ),
    ).toThrow(ForbiddenException)
  })

  it('allows native requests only when the native client header is paired with a native origin', () => {
    const service = createService()

    expect(
      service.isNativeRequest(
        webContext({
          'x-vox2vocal-client': 'native',
          origin: 'vox2vocal://auth',
        }),
      ),
    ).toBe(true)
    expect(
      service.isNativeRequest(
        webContext({
          'x-vox2vocal-client': 'native',
          origin: 'https://app.vox2vocal.com',
        }),
      ),
    ).toBe(false)
    expect(
      service.isNativeRequest(
        webContext({
          'x-vox2vocal-client': 'native',
          referer: 'https://app.vox2vocal.com/login',
        }),
      ),
    ).toBe(false)
  })

  it('reads refresh tokens from HttpOnly cookie contracts for web requests', () => {
    const service = createService()
    const refreshToken = service.getRefreshToken(
      webContext({
        cookie: 'theme=dark; vox2vocal_refresh_token=refresh.token; other=1',
      }),
    )

    expect(refreshToken).toBe('refresh.token')
  })

  it('requires an explicit refresh token for native refresh/logout requests', () => {
    const service = createService()
    const context = webContext({
      'x-vox2vocal-client': 'native',
    })

    expect(() => service.getRefreshToken(context)).toThrow(UnauthorizedException)
    expect(service.getRefreshToken(context, 'native.refresh')).toBe('native.refresh')
  })

  it('sets local development refresh cookies without Secure by default', () => {
    const service = createService()
    const setHeader = jest.fn()

    service.setRefreshCookie(
      {
        res: {
          setHeader,
        },
      },
      'refresh.token',
      604800,
    )

    const cookie = setHeader.mock.calls[0][1][0] as string

    expect(cookie).toContain('vox2vocal_refresh_token=refresh.token')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Max-Age=604800')
    expect(cookie).not.toContain('Secure')
  })

  it('sets Secure refresh cookies in production', () => {
    const service = createService({
      NODE_ENV: 'production',
    })
    const setHeader = jest.fn()

    service.setRefreshCookie(
      {
        res: {
          setHeader,
        },
      },
      'refresh.token',
      604800,
    )

    const cookie = setHeader.mock.calls[0][1][0] as string

    expect(cookie).toContain('Secure')
  })
})
