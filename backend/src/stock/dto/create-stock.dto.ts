import { IsNumber, IsNotEmpty, Min, IsOptional } from 'class-validator';

export class CreateStockDto {
  @IsNumber()
  @IsNotEmpty()
  location_id: number;

  @IsNumber()
  @IsNotEmpty()
  variant_id: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  quantity_on_hand: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  quantity_reserved?: number;
}

