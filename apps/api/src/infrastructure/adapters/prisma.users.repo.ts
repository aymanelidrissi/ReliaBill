import { Injectable } from '@nestjs/common';
import type { UsersRepoPort, UserEntity } from '../../core/ports/users.repo.port';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaUsersRepo implements UsersRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { email } }) as any;
  }
  findById(id: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { id } }) as any;
  }
  create(email: string, passwordHash: string): Promise<UserEntity> {
    return this.prisma.user.create({
      data: { email, passwordHash },
    }) as any;
  }
}
