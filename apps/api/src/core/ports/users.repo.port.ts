// purpose: user persistence abstraction; keeps domain logic decoupled from Prisma
export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsersRepoPort {
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  create(email: string, passwordHash: string): Promise<UserEntity>;
}
export const USERS_REPO = Symbol('USERS_REPO');
