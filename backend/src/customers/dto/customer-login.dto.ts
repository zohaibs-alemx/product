import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class CustomerLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
