import { Body, Controller, Get, HttpException, HttpStatus, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyService } from '../core/services/company.service';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';

@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly service: CompanyService) {}

  @Get('me')
  async getMine(@Req() req: any) {
    return this.service.getMine(req.user.id);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateCompanyDto) {
    const payload = {
      legalName: dto.legalName,
      vat: dto.vat,
      iban: dto.iban,
      street: dto.street ?? '',
      city: dto.city ?? '',
      postalCode: dto.postalCode ?? '',
      country: dto.country ?? 'BE',
    };
    try {
      return await this.service.createMine(req.user.id, payload);
    } catch (e: any) {
      if (e?.message === 'COMPANY_EXISTS') {
        throw new HttpException('Company already exists for this user', HttpStatus.CONFLICT);
      }
      throw e;
    }
  }

  @Put('me')
  async updateMine(@Req() req: any, @Body() dto: UpdateCompanyDto) {
    try {
      return await this.service.updateMine(req.user.id, dto);
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') {
        throw new HttpException('Company not found', HttpStatus.NOT_FOUND);
      }
      throw e;
    }
  }
}
