import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

import { UserModel } from '../me/user.model'

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email!: string

  @Field()
  @MinLength(8)
  password!: string
}

@InputType()
export class SignUpInput extends LoginInput {
  @Field()
  @IsString()
  displayName!: string
}

@InputType()
export class RefreshSessionInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  refreshToken?: string
}

@InputType()
export class LogoutInput extends RefreshSessionInput {}

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken!: string

  @Field(() => Int)
  expiresIn!: number

  @Field(() => String, { nullable: true })
  refreshToken?: string | null

  @Field(() => UserModel)
  user!: UserModel
}
