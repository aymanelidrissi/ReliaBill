import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateCompanyDto {
  @IsString()
  @IsOptional()
  legalName?: string;

  @IsString()
  @IsOptional()
  vat?: string;

  @IsString()
  @IsOptional()
  iban?: string;

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
