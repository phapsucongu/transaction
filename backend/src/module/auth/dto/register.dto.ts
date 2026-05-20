import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string = '';

  @IsString()
  @IsNotEmpty()
  full_name: string = '';

  @IsString()
  @MinLength(6)
  password: string = '';
}