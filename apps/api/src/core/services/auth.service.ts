import { Inject, Injectable } from '@nestjs/common';
import { HASHER, JWT, USERS_REPO } from '../ports';
import type { UsersRepoPort } from '../ports';
import type { HasherPort } from '../ports';
import type { JwtPort } from '../ports';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USERS_REPO) private readonly users: UsersRepoPort,
    @Inject(HASHER) private readonly hasher: HasherPort,
    @Inject(JWT) private readonly jwt: JwtPort,
  ) {}

  async registerDev(_email: string, _password: string) {
    throw new Error('NOT_IMPLEMENTED');
  }

  async verifyCredentials(_email: string, _password: string) {
    throw new Error('NOT_IMPLEMENTED');
  }

  async me(_userId: string) {
    throw new Error('NOT_IMPLEMENTED');
  }
}
