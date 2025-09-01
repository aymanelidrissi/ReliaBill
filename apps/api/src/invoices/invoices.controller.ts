import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvoiceService } from '../core/services/invoice.service';
import { InvoiceDocumentsService } from '../core/services/invoice.documents.service';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly service: InvoiceService,
    private readonly docs: InvoiceDocumentsService,
  ) { }

  @Get()
  async list(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('query') query?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    try {
      const p = Number.isFinite(+page!) && +page! > 0 ? +page! : 1;
      const l = Number.isFinite(+limit!) && +limit! > 0 ? +limit! : 10;
      const df = this.parseDateOpt(dateFrom, 'dateFrom');
      const dt = this.parseDateOpt(dateTo, 'dateTo');
      return await this.service.list(req.user.id, {
        page: p,
        limit: l,
        status: (status as any) || undefined,
        query: query || undefined,
        dateFrom: df,
        dateTo: dt,
      });
    } catch (e: any) {
      if (e?.message === 'NO_COMPANY') throw new BadRequestException('Create company first');
      throw e;
    }
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    try {
      return await this.service.create(req.user.id, body);
    } catch (e: any) {
      if (e?.message === 'NO_COMPANY') throw new BadRequestException('Create company first');
      if (e?.message === 'NO_LINES') throw new BadRequestException('At least one line required');
      if (e?.message === 'BAD_DATES') throw new BadRequestException('Invalid issue/due date');
      if (e?.message === 'DUE_BEFORE_ISSUE') throw new BadRequestException('Due date must be after issue date');
      if (e?.message === 'CLIENT_NOT_FOUND') throw new NotFoundException('Client not found');
      throw e;
    }
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    try {
      const inv = await this.service.get(req.user.id, id);
      if (!inv) throw new NotFoundException('Invoice not found');
      return inv;
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') throw new NotFoundException('Invoice not found');
      throw e;
    }
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    try {
      return await this.service.update(req.user.id, id, body);
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') throw new NotFoundException('Invoice not found');
      throw e;
    }
  }

  @Post(':id/prepare')
  async prepare(@Req() req: any, @Param('id') id: string, @Query('force') force?: string) {
    const f = (force ?? '').toLowerCase();
    const isForce = f === '1' || f === 'true' || f === 'yes';
    const inv = await this.service.get(req.user.id, id);
    if (!inv) throw new NotFoundException('Invoice not found');
    const hasXml = !!this.resolveArtifactPath(inv?.xmlPath);
    const hasPdf = !!this.resolveArtifactPath(inv?.pdfPath);
    if (!isForce && inv.status === 'READY' && hasXml && hasPdf) {
      return { status: 'READY', xmlPath: inv.xmlPath, pdfPath: inv.pdfPath };
    }
    return this.docs.prepare(req.user.id, id);
  }

  @Get(':id/download-pdf')
  async downloadPdf(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const inv = await this.service.get(req.user.id, id);
    const abs = this.resolveArtifactPath(inv?.pdfPath);
    if (!abs) throw new NotFoundException('PDF not found');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(abs)}"`);
    fs.createReadStream(abs).pipe(res);
  }

  @Get(':id/download-xml')
  async downloadXml(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const inv = await this.service.get(req.user.id, id);
    const abs = this.resolveArtifactPath(inv?.xmlPath);
    if (!abs) throw new NotFoundException('XML not found');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(abs)}"`);
    fs.createReadStream(abs).pipe(res);
  }

  @Post(':id/send')
  async send(@Req() req: any, @Param('id') id: string) {
    const inv = await this.service.get(req.user.id, id);
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status === 'SENT' || inv.status === 'DELIVERED') {
      return { id: inv.id, messageId: inv.hermesMessageId ?? null, status: inv.status, route: 'PEPPOL' };
    }
    return this.docs.send(req.user.id, id);
  }

  @Get(':id/logs')
  async logs(@Req() req: any, @Param('id') id: string) {
    return this.docs.listLogs(req.user.id, id);
  }

  @Get(':id/refresh-status')
  async refreshGet(@Req() req: any, @Param('id') id: string) {
    return this.docs.refreshStatus(req.user.id, id);
  }

  @Post(':id/refresh-status')
  async refreshPost(@Req() req: any, @Param('id') id: string) {
    return this.docs.refreshStatus(req.user.id, id);
  }

  private parseDateOpt(s: string | undefined, field: 'dateFrom' | 'dateTo'): Date | undefined {
    if (!s) return undefined;
    const d = new Date(s);
    if (isNaN(+d)) throw new BadRequestException(`Invalid ${field} (expected YYYY-MM-DD or ISO date)`);
    return d;
  }

  private resolveArtifactPath(stored: string | null | undefined): string | null {
    if (!stored) return null;
    let rel = String(stored).replace(/[\\/]+/g, path.sep);
    const legacyPrefix = 'storage' + path.sep;
    if (rel.startsWith(legacyPrefix)) rel = rel.slice(legacyPrefix.length);
    if (path.isAbsolute(rel) && fs.existsSync(rel)) return rel;
    const base = process.env.DOCS_DIR
      ? path.isAbsolute(process.env.DOCS_DIR)
        ? process.env.DOCS_DIR
        : path.resolve(process.cwd(), process.env.DOCS_DIR)
      : path.resolve(process.cwd(), 'storage');
    const abs = path.resolve(base, rel);
    if (fs.existsSync(abs)) return abs;
    const alt = path.resolve(process.cwd(), rel);
    if (fs.existsSync(alt)) return alt;
    return null;
  }
}
