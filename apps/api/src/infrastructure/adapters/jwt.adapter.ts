import { Injectable } from '@nestjs/common';
import type { JwtPort } from '../../core/ports/jwt.port';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAdapter implements JwtPort {
  constructor(private readonly jwt: JwtService) {}
  sign(payload: Record<string, any>, expiresIn = '30d') {
    return this.jwt.signAsync(payload, { expiresIn });
  }
  verify<T extends object = any>(token: string) {
    return this.jwt.verifyAsync<T>(token);
  }
}
