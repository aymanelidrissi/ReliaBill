import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceService } from '../core/services/invoice.service';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoiceService) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('query') query?: string,
    @Query('status') status?: 'DRAFT'|'READY'|'SENT'|'DELIVERED'|'FAILED',
    @Query('clientId') clientId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    try {
      const p = parseInt(page || '1', 10) || 1;
      const l = Math.min(100, parseInt(limit || '10', 10) || 10);
      const df = dateFrom ? new Date(dateFrom) : undefined;
      const dt = dateTo ? new Date(dateTo) : undefined;
      return await this.service.list(req.user.id, { page: p, limit: l, query, status, clientId, dateFrom: df, dateTo: dt });
    } catch (e: any) {
      if (e.message === 'NO_COMPANY') throw new BadRequestException('Create company first');
      throw e;
    }
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateInvoiceDto) {
    try {
      return await this.service.create(req.user.id, dto);
    } catch (e: any) {
      if (e.message === 'NO_COMPANY') throw new BadRequestException('Create company first');
      if (e.message === 'NO_LINES') throw new BadRequestException('Invoice must have at least one line');
      if (e.message === 'BAD_DATES') throw new BadRequestException('Invalid dates');
      if (e.message === 'DUE_BEFORE_ISSUE') throw new BadRequestException('Due date must be after issue date');
      if (e.message === 'CLIENT_NOT_FOUND') throw new BadRequestException('Client not found');
      throw e;
    }
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    try {
      return await this.service.get(req.user.id, id);
    } catch (e: any) {
      if (e.message === 'NO_COMPANY') throw new BadRequestException('Create company first');
      if (e.message === 'NOT_FOUND') throw new NotFoundException();
      throw e;
    }
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    try {
      return await this.service.update(req.user.id, id, dto);
    } catch (e: any) {
      if (e.message === 'NO_COMPANY') throw new BadRequestException('Create company first');
      if (e.message === 'NOT_FOUND') throw new NotFoundException();
      if (e.message === 'NO_LINES') throw new BadRequestException('Invoice must have at least one line');
      if (e.message === 'BAD_DATES') throw new BadRequestException('Invalid dates');
      if (e.message === 'DUE_BEFORE_ISSUE') throw new BadRequestException('Due date must be after issue date');
      if (e.message === 'CLIENT_NOT_FOUND') throw new BadRequestException('Client not found');
      throw e;
    }
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    try {
      return await this.service.remove(req.user.id, id);
    } catch (e: any) {
      if (e.message === 'NO_COMPANY') throw new BadRequestException('Create company first');
      if (e.message === 'NOT_FOUND') throw new NotFoundException();
      throw e;
    }
  }
}
