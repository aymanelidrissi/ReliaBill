import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type HookBody = { messageId: string; status?: string; detail?: string };

@Controller('peppol')
export class PeppolWebhookController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('webhook')
  @HttpCode(200)
  async handle(@Body() b: HookBody) {
    if (!b?.messageId) return { ok: false };

    const inv = await this.prisma.invoice.findFirst({ where: { hermesMessageId: b.messageId } });
    if (!inv) return { ok: true };

    const map: Record<string, any> = {
      SENT: 'SENT',
      DELIVERED: 'DELIVERED',
      FAILED: 'FAILED',
      'IN_TRANSIT': 'SENT',
    };
    const next = map[(b.status || '').toUpperCase()] || inv.status;

    await this.prisma.invoice.update({
      where: { id: inv.id },
      data: {
        status: next,
        logs: {
          create: {
            status: 'WEBHOOK',
            message: `Webhook status=${b.status || 'UNKNOWN'}`,
            provider: 'peppol-ap',
          },
        },
      },
    });

    return { ok: true };
  }
}
