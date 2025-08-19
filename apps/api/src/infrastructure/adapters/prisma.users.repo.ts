// purpose: concrete users repo against Prisma; real logic later
import { Injectable } from '@nestjs/common';
import { UsersRepoPort, UserEntity } from '../../core/ports/users.repo.port';

@Injectable()
export class PrismaUsersRepo implements UsersRepoPort {
  async findByEmail(_email: string): Promise<UserEntity | null> {
    throw new Error('NOT_IMPLEMENTED');
  }
  async findById(_id: string): Promise<UserEntity | null> {
    throw new Error('NOT_IMPLEMENTED');
  }
  async create(_email: string, _passwordHash: string): Promise<UserEntity> {
    throw new Error('NOT_IMPLEMENTED');
  }
}
