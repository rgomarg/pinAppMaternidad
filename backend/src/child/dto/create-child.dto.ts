import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional, IsDate, IsNumber, IsEnum } from 'class-validator';
import { Sex } from '@prisma/client';


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
    allergies?: string; 

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

    @IsNotEmpty()
    @IsEnum(Sex)
    sex!: 'MALE' | 'FEMALE' ;



}
