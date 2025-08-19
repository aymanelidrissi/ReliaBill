import { Injectable } from '@nestjs/common';
import type { HasherPort } from '../../core/ports/hasher.port';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class BcryptHasher implements HasherPort {
  private readonly rounds = 10;
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }
  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
