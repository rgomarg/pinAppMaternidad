import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDiseaseDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    diagnosticatedAge?: Date;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    endDate?: Date;

    @IsInt()
    childId!: number;
}
