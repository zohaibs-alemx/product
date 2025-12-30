import {
  IsNumber,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';

export class CreateVariantDto {
  @IsNumber()
  @IsNotEmpty()
  product_id: number;

  @IsNumber()
  @IsNotEmpty()
  color_id: number;

  @IsNumber()
  @IsNotEmpty()
  size_id: number;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  cost_price: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  selling_price: number;

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


