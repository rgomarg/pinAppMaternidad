import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { CreateThreadDto } from './create-thread.dto';

export class UpdateThreadDto extends PartialType(OmitType(CreateThreadDto, ['ownerId'] as const)) {
    // Obligatorio: se usa para comprobar que el hilo es de quien lo edita
    @Type(() => Number)
    @IsInt()
    ownerId!: number;
}
