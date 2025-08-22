import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceLineDto {
  @IsString()
  description!: string;

  @IsNumber()
  @Min(0.01, { message: 'quantity must be >= 0.01' })
  quantity!: number;

  @IsNumber()
  @Min(0, { message: 'unitPrice must be >= 0' })
  unitPrice!: number;

  @IsNumber()
  @Min(0, { message: 'vatRate must be >= 0' })
  vatRate!: number;
}

export class CreateInvoiceDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9]{24}$/, {
    message: 'clientId must be a CUID (e.g., cxxxxxxxxxxxxxxxxxxxxxxx)',
  })
  clientId!: string;

  @IsDateString()
  issueDate!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines!: InvoiceLineDto[];
}
