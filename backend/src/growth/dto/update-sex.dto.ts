import { IsEnum } from 'class-validator';
import { Sex } from '@prisma/client';

export class UpdateSexDto {
    @IsEnum(Sex, { message: 'El sexo debe ser MALE o FEMALE' })
    sex!: Sex;
}
