import { Controller, Post, Headers, Body, BadRequestException, Inject } from '@nestjs/common';
import { DELIVERY_LOGS_REPO } from '../core/ports/deliverylog.repo.port';
import type { DeliveryLogsRepoPort } from '../core/ports/deliverylog.repo.port';
import { INVOICES_REPO } from '../core/ports/invoices.repo.port';
import type { InvoicesRepoPort, InvoiceStatus } from '../core/ports/invoices.repo.port';
import * as crypto from 'crypto';

type Payload = { messageId: string; status: 'DELIVERED' | 'FAILED' | 'SENT' };

@Controller('invoices/delivery')
export class DeliveryController {
  constructor(
    @Inject(INVOICES_REPO) private readonly invoices: InvoicesRepoPort,
    @Inject(DELIVERY_LOGS_REPO) private readonly logs: DeliveryLogsRepoPort,
  ) {}

  @Post('callback')
  async callback(@Headers() headers: any, @Body() body: any) {
    const secret = process.env.HERMES_WEBHOOK_SECRET || '';
    if (secret) {
      const sig = headers['x-signature'] || headers['x-hermes-signature'] || '';
      const raw = JSON.stringify(body);
      const cmp = crypto.createHmac('sha256', secret).update(raw).digest('hex');
      if (!sig || String(sig) !== cmp) throw new BadRequestException('BAD_SIGNATURE');
    }
    const payload = body as Payload;
    if (!payload?.messageId || !payload?.status) throw new BadRequestException('BAD_PAYLOAD');

    const inv = await this.invoices.getByHermesMessageId(payload.messageId);
    if (!inv) throw new BadRequestException('INVOICE_NOT_FOUND');

    const next: InvoiceStatus =
      payload.status === 'DELIVERED' ? 'DELIVERED' :
      payload.status === 'FAILED' ? 'FAILED' : 'SENT';

    const updated = await this.invoices.update(inv.companyId, inv.id, { status: next });

    await this.logs.create({
      invoiceId: inv.id,
      kind: 'STATUS',
      message: `Status ${payload.status}`,
    });

    return { ok: true, invoiceId: inv.id, status: updated.status };
  }
}
