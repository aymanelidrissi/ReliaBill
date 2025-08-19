import { Module } from '@nestjs/common';
import { USERS_REPO } from '../core/ports/users.repo.port';
import { PrismaUsersRepo } from '../infrastructure/adapters/prisma.users.repo';

@Module({
  providers: [{ provide: USERS_REPO, useClass: PrismaUsersRepo }],
  exports: [{ provide: USERS_REPO, useClass: PrismaUsersRepo }],
})
export class UsersModule {}
