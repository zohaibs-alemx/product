import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateLocationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(['store', 'warehouse', 'counter'])
  @IsOptional()
  type?: 'store' | 'warehouse' | 'counter';

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: 'active' | 'inactive';
}


