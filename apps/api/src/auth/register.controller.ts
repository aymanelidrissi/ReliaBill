import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from '../core/services/auth.service';
import { RegisterDto } from './dtos/register.dto';

@Controller('auth')
export class RegisterController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }
}
