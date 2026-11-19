import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

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
  @Matches(/^[0-9+()\s-]+$/, { message: 'El teléfono solo puede contener números y símbolos telefónicos válidos' })
  // Entre 9 y 15 dígitos (sin contar espacios ni símbolos)
  @Matches(/^(?:\D*\d){9,15}\D*$/, { message: 'El teléfono debe tener entre 9 y 15 dígitos' })
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @IsIn(['MOTHER', 'FATHER', 'GUARDIAN'])
  profileRole?: 'MOTHER' | 'FATHER' | 'GUARDIAN';

  @IsOptional()
  @IsBoolean()
  notifyMedicine?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyAppointments?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyForum?: boolean;
}
