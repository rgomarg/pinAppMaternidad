import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, } from "class-validator";
import { EventType } from '@prisma/client'

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    title !: string;

    @IsOptional()
    @IsString()
    description?: string;

    @Type(() => Date)
    @IsDate()
    date!: Date;

    @IsOptional()
    @IsBoolean()
    notification?: boolean;

    @IsOptional()
    @IsEnum(EventType)
    type?: EventType;

    @Type(() => Number)
    @IsInt()
    childId!: number;
}
