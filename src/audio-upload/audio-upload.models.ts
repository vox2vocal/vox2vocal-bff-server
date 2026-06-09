import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'
import { IsString, Matches } from 'class-validator'

@InputType()
export class CreateAudioUploadSessionInput {
  @Field()
  @IsString()
  originalFilename!: string

  @Field()
  @IsString()
  @Matches(/^audio\/[A-Za-z0-9.+_-]+$/)
  contentType!: string
}

@ObjectType()
export class AudioUploadHeader {
  @Field()
  name!: string

  @Field()
  value!: string
}

@ObjectType()
export class AudioUploadSession {
  @Field()
  audioAssetId!: string

  @Field()
  bucket!: string

  @Field()
  sourceObjectKey!: string

  @Field()
  uploadUrl!: string

  @Field()
  method!: string

  @Field(() => [AudioUploadHeader])
  headers!: AudioUploadHeader[]

  @Field(() => Int)
  expiresIn!: number

  @Field()
  expiresAt!: string

  @Field()
  idempotencyKey!: string
}
