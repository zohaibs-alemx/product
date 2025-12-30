import {
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class ConfirmOrderDto {
  @IsEnum(['cod', 'card', 'upi', 'bank_transfer', 'wallet'])
  @IsNotEmpty()
  payment_method: 'cod' | 'card' | 'upi' | 'bank_transfer' | 'wallet';

  @IsString()
  @IsOptional()
  shipping_address?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

