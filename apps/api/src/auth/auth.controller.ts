import { Body, Controller, Get, HttpException, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from '../core/services/auth.service';
import { RegisterDevDto } from './dtos/register-dev.dto';
import { VerifyCredentialsDto } from './dtos/verify-credentials.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register-dev')
  async register(@Body() dto: RegisterDevDto) {
    try {
      return await this.auth.registerDev(dto.email, dto.password);
    } catch (e: any) {
      if (e?.message === 'EMAIL_TAKEN') {
        throw new HttpException('Email already in use', HttpStatus.CONFLICT);
      }
      throw e;
    }
  }

  @Post('verify-credentials')
  async login(@Body() dto: VerifyCredentialsDto) {
    try {
      return await this.auth.verifyCredentials(dto.email, dto.password);
    } catch (e: any) {
      if (e?.message === 'INVALID_CREDENTIALS') {
        throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }
      throw e;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.auth.me(req.user.id);
  }
}
