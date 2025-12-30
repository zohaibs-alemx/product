import { IsNumber, IsNotEmpty, Min, IsOptional } from 'class-validator';

export class CreateSaleLineDto {
  @IsNumber()
  @IsNotEmpty()
  variant_id: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  unit_price: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  tax_rate?: number;
}

