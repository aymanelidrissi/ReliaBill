import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateClientDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  
  @Matches(/^[A-Za-z]{2}[A-Za-z0-9]{2,12}$/, {
    message: 'vat must start with a 2-letter country code followed by 2–12 alphanumerics',
  })
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
  @Length(2, 2, { message: 'country must be a 2-letter ISO code' })
  @Matches(/^[A-Za-z]{2}$/, { message: 'country must be letters A–Z' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value
  )
  country?: string;

  @IsString()
  @IsOptional()

  @Matches(/^\d{4}$/, { message: 'peppolScheme must be 4 digits (e.g. 0208)' })
  peppolScheme?: string | null;

  @IsString()
  @IsOptional()

  @ValidateIf((o) => o.deliveryMode === 'PEPPOL')
  @Matches(/^\d{4}:.+$/, {
    message: 'peppolId must be like "0208:4711000087"',
  })
  peppolId?: string | null;

  @IsIn(['PEPPOL', 'HERMES'])
  @IsOptional()
  deliveryMode?: 'PEPPOL' | 'HERMES';
}
