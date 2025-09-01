import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../core/services/auth.service';
import { RegisterDevDto } from './dtos/register-dev.dto';
import { VerifyCredentialsDto } from './dtos/verify-credentials.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RL } from '../config/rate-limit';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) { }

  @Post('register')
  @Throttle({ default: RL.REGISTER })
  async register(@Body() dto: RegisterDevDto) {
    try {
      return await this.auth.register(dto.email, dto.password);
    } catch (e: any) {
      if (e?.message === 'EMAIL_TAKEN') {
        throw new HttpException('EMAIL_TAKEN', HttpStatus.BAD_REQUEST);
      }
      throw e;
    }
  }

  @Post('register-dev')
  @Throttle({ default: RL.REGISTER })
  async registerDev(@Body() dto: RegisterDevDto) {
    try {
      return await this.auth.registerDev(dto.email, dto.password);
    } catch (e: any) {
      if (e?.message === 'EMAIL_TAKEN') {
        throw new HttpException('EMAIL_TAKEN', HttpStatus.BAD_REQUEST);
      }
      throw e;
    }
  }

  @Post('verify-credentials')
  @Throttle({ default: RL.LOGIN })
  @HttpCode(200)
  async verify(@Body() dto: VerifyCredentialsDto) {
    try {
      return await this.auth.verifyCredentials(dto.email, dto.password);
    } catch (e: any) {
      if (e?.message === 'INVALID_CREDENTIALS') {
        throw new HttpException('INVALID_CREDENTIALS', HttpStatus.UNAUTHORIZED);
      }
      throw e;
    }
  }

  @Post('login')
  @Throttle({ default: RL.LOGIN })
  @HttpCode(200)
  login(@Body() dto: VerifyCredentialsDto) {
    return this.verify(dto)
  }


  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.auth.me(req.user.id);
  }
}
