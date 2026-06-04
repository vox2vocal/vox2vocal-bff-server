# Vox2Vocal BFF Server

React Native App/Web을 위한 GraphQL BFF 서버입니다.

## 역할

- 외부 공개 GraphQL endpoint 제공
- RN App/RN Web 화면에 맞춘 schema 제공
- `api-gateway`를 gRPC로 호출
- 클라이언트 인증 context를 내부 서버로 전달

## 포트

- HTTP/GraphQL: `4000`
- Health check: `GET /health`
- GraphQL: `POST /graphql`

## 실행

```bash
npm install
npm run start:dev
```
