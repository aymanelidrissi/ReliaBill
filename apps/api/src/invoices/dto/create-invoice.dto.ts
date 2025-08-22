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

export class CreateInvoiceDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsDateString()
  issueDate!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsArray()
  lines!: InvoiceLineDto[];
}
