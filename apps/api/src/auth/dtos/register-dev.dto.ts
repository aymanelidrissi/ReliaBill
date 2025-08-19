import { IsEmail, MinLength } from 'class-validator';

export class RegisterDevDto {
  @IsEmail()
  email!: string;

  @MinLength(6)
  password!: string;
}
