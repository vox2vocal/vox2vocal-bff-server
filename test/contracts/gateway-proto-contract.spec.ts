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
    expect(proto).toContain(
      'rpc CreateAudioUploadSession(CreateAudioUploadSessionRequest) returns (CreateAudioUploadSessionResponse);',
    )
  })

  it('keeps refresh token metadata in the auth response contract', () => {
    expect(proto).toContain('string refresh_token = 2;')
    expect(proto).toContain('int32 refresh_expires_in = 5;')
  })

  it('exposes audio upload session fields', () => {
    expect(proto).toContain('message CreateAudioUploadSessionRequest')
    expect(proto).toContain('string original_filename = 2;')
    expect(proto).toContain('string content_type = 3;')
    expect(proto).toContain('message CreateAudioUploadSessionResponse')
    expect(proto).toContain('string audio_asset_id = 1;')
    expect(proto).toContain('string source_object_key = 3;')
    expect(proto).toContain('string upload_url = 4;')
    expect(proto).toContain('map<string, string> headers = 6;')
    expect(proto).toContain('string idempotency_key = 9;')
  })
})
