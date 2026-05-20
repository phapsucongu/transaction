import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string = '';

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string = '';

  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'currency must be a 3-letter uppercase code, for example VND or USD',
  })
  currency: string = '';
}