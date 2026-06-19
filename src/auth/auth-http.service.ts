import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

const defaultRefreshCookieName = 'vox2vocal_refresh_token'

export const csrfHeaderName = 'x-vox2vocal-csrf'
export const nativeClientHeaderName = 'x-vox2vocal-client'

export type AuthContext = {
  req?: {
    headers?: Record<string, string | string[] | undefined>
  }
  res?: {
    getHeader?: (name: string) => number | string | string[] | undefined
    setHeader?: (name: string, value: number | string | string[]) => void
  }
}

@Injectable()
export class AuthHttpService {
  constructor(private readonly configService: ConfigService) {}

  assertCredentialRequest(context: AuthContext) {
    if (this.isNativeRequest(context)) {
      return
    }

    const headers = context.req?.headers ?? {}
    const csrfHeader = this.getHeader(headers, csrfHeaderName)

    if (csrfHeader !== '1') {
      throw new ForbiddenException('FORBIDDEN')
    }

    if (!this.isAllowedBrowserOrigin(context)) {
      throw new ForbiddenException('FORBIDDEN')
    }
  }

  clearRefreshCookie(context: AuthContext) {
    this.appendSetCookieHeader(
      context,
      this.buildRefreshCookie('', {
        maxAgeSeconds: 0,
      }),
    )
  }

  getRefreshToken(context: AuthContext, explicitRefreshToken?: string): string {
    if (this.isNativeRequest(context)) {
      if (!explicitRefreshToken) {
        throw new UnauthorizedException('UNAUTHENTICATED')
      }

      return explicitRefreshToken
    }

    return this.getCookie(context, this.getRefreshCookieName())
  }

  isNativeRequest(context: AuthContext): boolean {
    const headers = context.req?.headers ?? {}
    const client = this.getHeader(headers, nativeClientHeaderName)
    const origin = this.getHeader(headers, 'origin')
    const referer = this.getHeader(headers, 'referer')
    const hasAllowedOrigin = !origin || this.isAllowedNativeOrigin(origin)
    const hasAllowedReferer = !referer || this.isAllowedNativeOrigin(referer)

    return client === 'native' && hasAllowedOrigin && hasAllowedReferer
  }

  setRefreshCookie(context: AuthContext, refreshToken: string, maxAgeSeconds: number) {
    this.appendSetCookieHeader(
      context,
      this.buildRefreshCookie(refreshToken, {
        maxAgeSeconds,
      }),
    )
  }

  shouldReturnRefreshTokenInBody(context: AuthContext): boolean {
    return this.isNativeRequest(context)
  }

  private appendSetCookieHeader(context: AuthContext, cookie: string) {
    const currentValue = context.res?.getHeader?.('Set-Cookie')
    const nextValue = Array.isArray(currentValue)
      ? [...currentValue, cookie]
      : currentValue
        ? [String(currentValue), cookie]
        : [cookie]

    context.res?.setHeader?.('Set-Cookie', nextValue)
  }

  private buildRefreshCookie(
    refreshToken: string,
    { maxAgeSeconds }: { maxAgeSeconds: number },
  ): string {
    const secure = this.shouldUseSecureCookie()
    const sameSite = this.configService.get<string>('BFF_REFRESH_COOKIE_SAME_SITE', 'Lax')
    const domain = this.configService.get<string>('BFF_REFRESH_COOKIE_DOMAIN', '')
    const encodedValue = encodeURIComponent(refreshToken)
    const parts = [
      `${this.getRefreshCookieName()}=${encodedValue}`,
      'HttpOnly',
      `SameSite=${sameSite}`,
      'Path=/',
      `Max-Age=${maxAgeSeconds}`,
    ]

    if (secure) {
      parts.push('Secure')
    }

    if (domain) {
      parts.push(`Domain=${domain}`)
    }

    return parts.join('; ')
  }

  private getAllowedOrigins(): Set<string> {
    const configuredOrigins = this.configService.get<string>('BFF_ALLOWED_ORIGINS', '')
    const defaults = [
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
    ]
    const origins = configuredOrigins
      ? configuredOrigins.split(',').map((origin) => origin.trim())
      : defaults

    return new Set(origins.filter(Boolean))
  }

  private getCookie(context: AuthContext, name: string): string {
    const cookieHeader = this.getHeader(context.req?.headers ?? {}, 'cookie')

    if (!cookieHeader) {
      throw new UnauthorizedException('UNAUTHENTICATED')
    }

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim())
    const prefix = `${name}=`
    const cookie = cookies.find((item) => item.startsWith(prefix))
    const value = cookie ? decodeURIComponent(cookie.slice(prefix.length)) : ''

    if (!value) {
      throw new UnauthorizedException('UNAUTHENTICATED')
    }

    return value
  }

  private getHeader(headers: Record<string, string | string[] | undefined>, name: string): string {
    const lowerName = name.toLowerCase()
    const value =
      headers[name] ??
      headers[lowerName] ??
      Object.entries(headers).find(([headerName]) => headerName.toLowerCase() === lowerName)?.[1]

    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
  }

  private getRefreshCookieName(): string {
    return this.configService.get<string>('BFF_REFRESH_COOKIE_NAME', defaultRefreshCookieName)
  }

  private isAllowedBrowserOrigin(context: AuthContext): boolean {
    const headers = context.req?.headers ?? {}
    const origin = this.getHeader(headers, 'origin')
    const referer = this.getHeader(headers, 'referer')
    const refererOrigin = referer ? this.safeOrigin(referer) : ''
    const requestOrigin = origin || refererOrigin

    return !!requestOrigin && this.getAllowedOrigins().has(requestOrigin)
  }

  private isAllowedNativeOrigin(origin: string): boolean {
    return origin.startsWith('vox2vocal://') || origin.startsWith('exp://')
  }

  private safeOrigin(url: string): string {
    try {
      return new URL(url).origin
    } catch {
      return ''
    }
  }

  private shouldUseSecureCookie(): boolean {
    const explicitSecure = this.configService.get<string>('BFF_REFRESH_COOKIE_SECURE')

    if (explicitSecure) {
      return explicitSecure === 'true'
    }

    return this.configService.get<string>('NODE_ENV') === 'production'
  }
}
