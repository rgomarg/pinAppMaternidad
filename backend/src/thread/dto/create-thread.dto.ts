import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateThreadDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    title!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    content!: string;

    // Sin auth todavía: el front envía el usuario seleccionado
    @Type(() => Number)
    @IsInt()
    ownerId!: number;

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @Type(() => Number)
    @IsInt({ each: true })
    tagIds?: number[];
}
