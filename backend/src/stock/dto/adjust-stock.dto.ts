import { IsNumber, IsNotEmpty, IsString } from 'class-validator';

export class AdjustStockDto {
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  type: 'add' | 'subtract' | 'set';

  @IsString()
  @IsNotEmpty()
  reason?: string;
}


