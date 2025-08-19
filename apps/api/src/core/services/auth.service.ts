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

  async registerDev(email: string, password: string) {
    const existing = await this.users.findByEmail(email);
    if (existing) throw new Error('EMAIL_TAKEN');
    const passwordHash = await this.hasher.hash(password);
    const user = await this.users.create(email, passwordHash);
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }

  async verifyCredentials(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new Error('INVALID_CREDENTIALS');
    const ok = await this.hasher.compare(password, user.passwordHash);
    if (!ok) throw new Error('INVALID_CREDENTIALS');
    const accessToken = await this.jwt.sign({ sub: user.id, email: user.email }, '30d');
    return { accessToken };
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new Error('NOT_FOUND');
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }
}
