import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('gateway proto contract', () => {
  const proto = readFileSync(join(process.cwd(), 'proto/gateway.proto'), 'utf8')

  it('exposes authentication session RPCs', () => {
    expect(proto).toContain('rpc SignUp(SignUpRequest) returns (AuthTokenResponse);')
    expect(proto).toContain('rpc Login(LoginRequest) returns (AuthTokenResponse);')
    expect(proto).toContain(
      'rpc RefreshSession(RefreshSessionRequest) returns (AuthTokenResponse);',
    )
    expect(proto).toContain('rpc Logout(LogoutRequest) returns (LogoutResponse);')
  })

  it('keeps refresh token metadata in the auth response contract', () => {
    expect(proto).toContain('string refresh_token = 2;')
    expect(proto).toContain('int32 refresh_expires_in = 5;')
  })
})
