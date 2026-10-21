import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
    // Recorta espacios para que un mensaje solo con espacios cuente como vacío
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    content!: string;

    // Sin auth todavía: el front envía el usuario seleccionado
    @Type(() => Number)
    @IsInt()
    authorId!: number;

    @Type(() => Number)
    @IsInt()
    threadId!: number;

    // Mensaje al que se responde; sin él la respuesta va al hilo
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    parentId?: number;
}
