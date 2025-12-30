import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  article_code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  brand_id: number;

  @IsNumber()
  @IsNotEmpty()
  category_id: number;

  @IsNumber()
  @IsOptional()
  subcategory_id?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  default_tax_rate?: number;

  @IsEnum(['active', 'discontinued'])
  @IsOptional()
  status?: 'active' | 'discontinued';
}

