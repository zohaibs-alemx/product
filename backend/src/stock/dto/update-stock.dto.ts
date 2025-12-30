import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateStockDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  quantity_on_hand?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  quantity_reserved?: number;
}


