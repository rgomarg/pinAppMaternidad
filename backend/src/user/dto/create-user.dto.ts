import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  surname?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?=.*\d)[0-9+()\s-]+$/, { message: 'El teléfono solo puede contener números y símbolos telefónicos válidos' })
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}
