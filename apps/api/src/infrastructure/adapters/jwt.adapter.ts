// purpose: concrete JWT adapter; real logic later
import { Injectable } from '@nestjs/common';
import { JwtPort } from '../../core/ports/jwt.port';

@Injectable()
export class JwtAdapter implements JwtPort {
  async sign(_payload: Record<string, any>, _expiresIn = '30d'): Promise<string> {
    throw new Error('NOT_IMPLEMENTED');
  }
  async verify<T = any>(_token: string): Promise<T> {
    throw new Error('NOT_IMPLEMENTED');
  }
}
