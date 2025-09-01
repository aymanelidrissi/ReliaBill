import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type LegacyHook = { messageId: string; status?: string; detail?: string };
type AcubeHook = { success?: boolean; document_id?: string; document_type?: string; request_at?: string; response_at?: string };

@Controller('peppol')
export class PeppolWebhookController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('webhook')
  @HttpCode(200)
  async handle(@Body() b: LegacyHook & AcubeHook) {
    // Normalize payload into messageId + normalized status
    const messageId = b.messageId || b.document_id;
    if (!messageId) return { ok: false };

    const inv = await this.prisma.invoice.findFirst({ where: { hermesMessageId: messageId } });
    if (!inv) return { ok: true };

    let next: any = inv.status;

    if (b.document_id && typeof b.success === 'boolean') {
      next = b.success ? 'DELIVERED' : 'FAILED';
    } else if (b.status) {
      const legacy = (b.status || '').toUpperCase();
      const map: Record<string, any> = {
        SENT: 'SENT',
        DELIVERED: 'DELIVERED',
        FAILED: 'FAILED',
        IN_TRANSIT: 'SENT',
      };
      next = map[legacy] || inv.status;
    }

    await this.prisma.invoice.update({
      where: { id: inv.id },
      data: {
        status: next,
        logs: {
          create: {
            status: 'WEBHOOK',
            message: b.document_id
              ? `A-Cube webhook: ${b.success ? 'DELIVERED' : 'FAILED'} (document_id=${b.document_id})`
              : `Webhook status=${b.status || 'UNKNOWN'}`,
            provider: 'peppol',
          },
        },
      },
    });

    return { ok: true };
  }
}
