import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class LikeMessageDto {
    // Sin auth todavía: el front envía el usuario seleccionado
    @Type(() => Number)
    @IsInt()
    userId!: number;
}
