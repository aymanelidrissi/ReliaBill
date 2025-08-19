import { IsEmail, MinLength } from 'class-validator';

export class VerifyCredentialsDto {
  @IsEmail()
  email!: string;

  @MinLength(6)
  password!: string;
}
