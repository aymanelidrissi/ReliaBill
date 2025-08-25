import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { RegisterController } from './register.controller';
import { AuthService } from '../core/services/auth.service';
import { HASHER } from '../core/ports/hasher.port';
import { JWT } from '../core/ports/jwt.port';
import { BcryptHasher } from '../infrastructure/adapters/bcrypt.hasher';
import { JwtAdapter } from '../infrastructure/adapters/jwt.adapter';
import { JwtAuthGuard } from './jwt-auth.guard';

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
    ThrottlerModule.forRoot([{ ttl: 60, limit: 20 }]),
  ],
  controllers: [AuthController, RegisterController],
  providers: [
    AuthService,
    { provide: HASHER, useClass: BcryptHasher },
    { provide: JWT, useClass: JwtAdapter },
    JwtAuthGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [
    JwtAuthGuard,
    JWT,
  ],
})
export class AuthModule {}
