import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../core/services/auth.service';
import { RegisterDevDto } from './dtos/register-dev.dto';
import { VerifyCredentialsDto } from './dtos/verify-credentials.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RL } from '../config/rate-limit';
import type { Response } from 'express';
import crypto from 'crypto';

function cookieName() {
  return process.env.COOKIE_NAME || 'rb.session';
}

function cookieOpts() {
  const prod = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: prod,
    maxAge: 1000 * 60 * 60 * 24 * 30,
    path: '/',
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

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
  async login(@Body() dto: VerifyCredentialsDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken } = await this.auth.verifyCredentials(dto.email, dto.password);

    res.cookie(cookieName(), accessToken, cookieOpts());

    if (process.env.CSRF_ENABLED === '1') {
      const csrfCookie = process.env.CSRF_COOKIE_NAME || 'rb.csrf';
      const val = crypto.randomBytes(24).toString('base64url');
      res.cookie(csrfCookie, val, { ...cookieOpts(), httpOnly: false });
    }

    return { ok: true, accessToken };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(cookieName(), { path: '/' });
    const csrfCookie = process.env.CSRF_COOKIE_NAME || 'rb.csrf';
    res.clearCookie(csrfCookie, { path: '/' });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.auth.me(req.user.id);
  }
}
