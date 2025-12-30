import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateSizeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  size_order?: number;
}


