import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

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

  @IsString()
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
