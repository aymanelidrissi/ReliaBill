import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientService } from '../core/services/client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly service: ClientService) {}

  @Get()
  async list(@Req() req: any, @Query('query') query?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    try {
      const p = Number.isFinite(+page!) && +page! > 0 ? +page! : 1;
      const l = Number.isFinite(+limit!) && +limit! > 0 ? +limit! : 10;
      return await this.service.list(req.user.id, { query, page: p, limit: l });
    } catch (e: any) {
      if (e?.message === 'NO_COMPANY') {
        throw new HttpException('Create company first', HttpStatus.BAD_REQUEST);
      }
      throw e;
    }
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateClientDto) {
    try {
      return await this.service.create(req.user.id, dto);
    } catch (e: any) {
      if (e?.message === 'NO_COMPANY') {
        throw new HttpException('Create company first', HttpStatus.BAD_REQUEST);
      }
      throw e;
    }
  }

  @Get(':id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    try {
      return await this.service.get(req.user.id, id);
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') {
        throw new HttpException('Client not found', HttpStatus.NOT_FOUND);
      }
      if (e?.message === 'NO_COMPANY') {
        throw new HttpException('Create company first', HttpStatus.BAD_REQUEST);
      }
      throw e;
    }
  }

  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateClientDto) {
    try {
      return await this.service.update(req.user.id, id, dto);
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') {
        throw new HttpException('Client not found', HttpStatus.NOT_FOUND);
      }
      if (e?.message === 'NO_COMPANY') {
        throw new HttpException('Create company first', HttpStatus.BAD_REQUEST);
      }
      throw e;
    }
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    try {
      return await this.service.delete(req.user.id, id);
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') {
        throw new HttpException('Client not found', HttpStatus.NOT_FOUND);
      }
      if (e?.message === 'NO_COMPANY') {
        throw new HttpException('Create company first', HttpStatus.BAD_REQUEST);
      }
      throw e;
    }
  }
}
