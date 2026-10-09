import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional, IsDate, IsNumber } from 'class-validator';



export class CreateChildDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @Type(() => Date)
    @IsDate()
    birthDate!: Date;

    @IsOptional()
    @IsString()
    bloodGroup?: string;

    @IsOptional()
    @IsString()
    allergies?: string; // no deberia se un array de strings?

    @IsNotEmpty()
    @IsNumber()
    parentId!: number;

    @IsOptional()
    @IsNumber()
    weight?: number;

    @IsOptional()
    @IsNumber()
    height?: number;

    @IsOptional()
    @IsString({ each: true })
    diseases?: string[];



}
