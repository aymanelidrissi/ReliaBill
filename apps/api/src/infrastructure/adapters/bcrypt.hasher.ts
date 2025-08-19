// purpose: concrete hasher; real logic will be added later
import { Injectable } from '@nestjs/common';
import { HasherPort } from '../../core/ports/hasher.port';

@Injectable()
export class BcryptHasher implements HasherPort {
  async hash(_plain: string): Promise<string> {
    throw new Error('NOT_IMPLEMENTED');
  }
  async compare(_plain: string, _hash: string): Promise<boolean> {
    throw new Error('NOT_IMPLEMENTED');
  }
}
