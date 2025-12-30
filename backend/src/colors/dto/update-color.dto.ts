import { IsString, IsOptional } from 'class-validator';

export class UpdateColorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;
}


