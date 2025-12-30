import {
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  Min,
} from 'class-validator';

export class UpdateVariantDto {
  @IsNumber()
  @IsOptional()
  color_id?: number;

  @IsNumber()
  @IsOptional()
  size_id?: number;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  cost_price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  selling_price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  mrp?: number;

  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: 'active' | 'inactive';

  @IsNumber()
  @IsOptional()
  @Min(0)
  min_stock_level?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  max_stock_level?: number;
}


