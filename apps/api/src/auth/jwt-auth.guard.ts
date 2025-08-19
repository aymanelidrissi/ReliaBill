import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JWT } from '../core/ports/jwt.port';
import type { JwtPort } from '../core/ports/jwt.port';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(JWT) private readonly jwt: JwtPort) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers['authorization'] as string | undefined;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    const token = auth.slice('Bearer '.length);
    try {
      const payload = await this.jwt.verify<{ sub: string; email: string }>(token);
      req.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
