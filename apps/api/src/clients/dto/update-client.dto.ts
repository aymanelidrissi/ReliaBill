import { IsEmail, IsIn, IsOptional, IsString, IsISO31661Alpha2 } from 'class-validator';

export class UpdateClientDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  vat?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  street?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsISO31661Alpha2()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  peppolScheme?: string | null;

  @IsString()
  @IsOptional()
  peppolId?: string | null;

  @IsIn(['PEPPOL', 'HERMES'])
  @IsOptional()
  deliveryMode?: 'PEPPOL' | 'HERMES';
}
