import { Transform, Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum HistoryKind {
    DISEASE = 'DISEASE',
    MEDICINE = 'MEDICINE',
    APPOINTMENT = 'APPOINTMENT',
    VACCINE = 'VACCINE',
    SYMPTOM = 'SYMPTOM',
}

export class HistorialChildDto {
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
    @IsArray()
    @IsEnum(HistoryKind, { each: true })
    kinds?: HistoryKind[];

    @IsOptional()
    @Type(() => Date) @IsDate()
    from?: Date;

    @IsOptional()
    @Type(() => Date) @IsDate()
    to?: Date;

    @IsOptional()
    @Type(() => Number) 
    @IsInt() 
    @Min(1) 
    @Max(50)
    limit: number = 20;

    @IsOptional() 
    @IsString()
    cursor?: string;
}
