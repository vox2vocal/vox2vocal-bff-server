import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class UserModel {
  @Field()
  id!: string

  @Field()
  email!: string

  @Field()
  displayName!: string

  @Field()
  role!: string
}
