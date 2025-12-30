import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSaleLineDto } from './create-sale-line.dto';

export class CreateSaleDto {
  @IsDateString()
  @IsNotEmpty()
  sale_date: string;

  @IsNumber()
  @IsNotEmpty()
  location_id: number;

  @IsNumber()
  @IsOptional()
  customer_id?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleLineDto)
  lines: CreateSaleLineDto[];

  @IsNumber()
  @IsOptional()
  discount_amount?: number;
}

