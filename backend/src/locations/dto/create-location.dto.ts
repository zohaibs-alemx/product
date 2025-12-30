import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['store', 'warehouse', 'counter'])
  @IsNotEmpty()
  type: 'store' | 'warehouse' | 'counter';

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: 'active' | 'inactive';
}


