import { IsArray, IsDateString, IsOptional, IsString, IsUUID, IsNumber, Min, IsIn } from 'class-validator';

class InvoiceLineDto {
  @IsString()
  description!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsNumber()
  @Min(0)
  vatRate!: number;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsUUID()
  clientId?: string | null;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  status?: 'DRAFT' | 'READY' | 'SENT' | 'DELIVERED' | 'FAILED';

  @IsOptional()
  @IsArray()
  lines?: InvoiceLineDto[];
}
