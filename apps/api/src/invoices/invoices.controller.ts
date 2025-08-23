import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceService } from '../core/services/invoice.service';
import { InvoiceDocumentsService } from '../core/services/invoice.documents.service';
import type { InvoiceStatus } from '../core/ports/invoices.repo.port';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly service: InvoiceService,
    private readonly docs: InvoiceDocumentsService,
  ) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('query') query?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const p = Number(page) || 1;
    const l = Math.min(100, Math.max(1, Number(limit) || 10));
    const st = this.parseStatus(status);
    const df = this.parseDateOpt(dateFrom, 'dateFrom');
    const dt = this.parseDateOpt(dateTo, 'dateTo');
    return this.service.list(req.user.id, { page: p, limit: l, query, status: st, clientId, dateFrom: df, dateTo: dt });
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateInvoiceDto) {
    try {
      return await this.service.create(req.user.id, dto);
    } catch (e: any) {
      if (e?.message === 'NO_COMPANY') throw new BadRequestException('Create company first');
      if (e?.message === 'CLIENT_NOT_FOUND') throw new BadRequestException('Client not found');
      if (e?.message === 'NO_LINES') throw new BadRequestException('At least one line is required');
      if (e?.message === 'BAD_DATES') throw new BadRequestException('Invalid issueDate or dueDate');
      if (e?.message === 'DUE_BEFORE_ISSUE') throw new BadRequestException('dueDate cannot be before issueDate');
      throw e;
    }
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    const inv = await this.service.get(req.user.id, id);
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    try {
      return await this.service.update(req.user.id, id, dto as any);
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') throw new NotFoundException('Invoice not found');
      if (e?.message === 'NO_LINES') throw new BadRequestException('At least one line is required');
      if (e?.message === 'BAD_DATES') throw new BadRequestException('Invalid issueDate or dueDate');
      if (e?.message === 'DUE_BEFORE_ISSUE') throw new BadRequestException('dueDate cannot be before issueDate');
      if (e?.message === 'CLIENT_NOT_FOUND') throw new BadRequestException('Client not found');
      throw e;
    }
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    try {
      return await this.service.remove(req.user.id, id);
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') throw new NotFoundException('Invoice not found');
      throw e;
    }
  }

  @Post(':id/prepare')
  async prepare(@Req() req: any, @Param('id') id: string) {
    return this.docs.prepare(req.user.id, id);
  }

  @Get(':id/download-pdf')
  async downloadPdf(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const inv = await this.service.get(req.user.id, id);
    if (!inv?.pdfPath || !fs.existsSync(inv.pdfPath)) throw new NotFoundException('PDF not found');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(inv.pdfPath)}"`);
    fs.createReadStream(inv.pdfPath).pipe(res);
  }

  @Get(':id/download-xml')
  async downloadXml(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const inv = await this.service.get(req.user.id, id);
    if (!inv?.xmlPath || !fs.existsSync(inv.xmlPath)) throw new NotFoundException('XML not found');
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(inv.xmlPath)}"`);
    fs.createReadStream(inv.xmlPath).pipe(res);
  }

  @Get(':id/logs')
  async logs(@Req() req: any, @Param('id') id: string) {
    return this.docs.listLogs(req.user.id, id);
  }

  @Post(':id/send')
  async send(@Req() req: any, @Param('id') id: string) {
    return this.docs.send(req.user.id, id);
  }

  private parseStatus(s?: string): InvoiceStatus | undefined {
    if (!s) return undefined;
    const v = s.toUpperCase();
    const allowed = ['DRAFT', 'READY', 'SENT', 'DELIVERED', 'FAILED'] as const;
    if (!(allowed as readonly string[]).includes(v)) {
      throw new BadRequestException(`Invalid status: "${s}". Allowed: DRAFT, READY, SENT, DELIVERED, FAILED`);
    }
    return v as InvoiceStatus;
  }

  private parseDateOpt(s: string | undefined, field: 'dateFrom' | 'dateTo'): Date | undefined {
    if (!s) return undefined;
    const d = new Date(s);
    if (isNaN(+d)) throw new BadRequestException(`Invalid ${field} (expected YYYY-MM-DD or ISO date)`);
    return d;
  }
}
