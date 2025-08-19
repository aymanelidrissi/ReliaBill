import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from '../core/services/auth.service';
import { HASHER } from '../core/ports/hasher.port';
import { JWT } from '../core/ports/jwt.port';
import { BcryptHasher } from '../infrastructure/adapters/bcrypt.hasher';
import { JwtAdapter } from '../infrastructure/adapters/jwt.adapter';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_HS256_SECRET')!,
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  providers: [
    AuthService,
    { provide: HASHER, useClass: BcryptHasher },
    { provide: JWT, useClass: JwtAdapter },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
