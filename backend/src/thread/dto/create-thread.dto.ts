import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Recorta espacios para que un texto solo con espacios cuente como vacío
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateThreadDto {
    @Transform(trim)
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    title!: string;

    @Transform(trim)
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    content!: string;

    // Sin auth todavía: el front envía el usuario seleccionado
    @Type(() => Number)
    @IsInt()
    ownerId!: number;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayUnique()
    @Type(() => Number)
    @IsInt({ each: true })
    tagIds!: number[];
}
