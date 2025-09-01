import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JWT } from '../core/ports/jwt.port';
import type { JwtPort } from '../core/ports/jwt.port';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(JWT) private readonly jwt: JwtPort) { }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req: any = ctx.switchToHttp().getRequest();

    const auth = (req.headers['authorization'] as string | undefined) || '';
    let token = '';

    if (auth?.startsWith('Bearer ')) {
      token = auth.slice('Bearer '.length);
    }

    if (!token && req.cookies) {
      const name = process.env.COOKIE_NAME || 'rb.session';
      token = req.cookies[name];
    }

    if (!token) throw new UnauthorizedException('Missing token');

    try {
      const payload = await this.jwt.verify<{ sub: string; email: string }>(token);
      req.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
