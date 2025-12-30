import {
  IsNumber,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsDateString()
  @IsNotEmpty()
  payment_date: string;

  @IsEnum(['cash', 'card', 'upi', 'bank_transfer', 'cheque'])
  @IsNotEmpty()
  payment_method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque';

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  reference_number?: string;
}


