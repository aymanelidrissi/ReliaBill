import { IsString, IsOptional, Length } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  legalName!: string;

  @IsString()
  vat!: string;

  @IsString()
  iban!: string;

  @IsString()
  @IsOptional()
  street?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  @Length(2, 2)
  country?: string;
}
