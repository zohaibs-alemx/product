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
import { CreateOrderLineDto } from './create-order-line.dto';

export class CreateOrderDto {
  @IsDateString()
  @IsNotEmpty()
  order_date: string;

  @IsNumber()
  @IsNotEmpty()
  location_id: number;

  @IsNumber()
  @IsOptional()
  customer_id?: number;

  @IsEnum(['online', 'offline'])
  @IsOptional()
  order_type?: 'online' | 'offline';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  lines: CreateOrderLineDto[];

  @IsNumber()
  @IsOptional()
  discount_amount?: number;

  @IsEnum(['cod', 'card', 'upi', 'bank_transfer', 'wallet'])
  @IsOptional()
  payment_method?: 'cod' | 'card' | 'upi' | 'bank_transfer' | 'wallet';

  @IsString()
  @IsOptional()
  shipping_address?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}


