import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GraphQLModule } from '@nestjs/graphql'

import { GatewayClientModule } from './gateway-client/gateway-client.module'
import { HealthModule } from './health/health.module'
import { MeResolver } from './me/me.resolver'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
      path: '/graphql',
      context: (context: { req: unknown }) => ({ req: context.req }),
    }),
    GatewayClientModule,
    HealthModule,
  ],
  providers: [MeResolver],
})
export class AppModule {}
