import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional, IsDate, IsNumber, IsEnum, IsArray, IsInt, ValidateNested } from 'class-validator';
import { Sex } from '@prisma/client';


export class ChildVaccineInput {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    appliedAt?: Date;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    scheduledFor?: Date;
}

export class ChildMedicineInput {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    dosage!: string;

    @IsOptional()
    @IsInt()
    intervalHours?: number;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    startDate?: Date;
}

export class CreateChildDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    surname?: string;

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

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChildVaccineInput)
    vaccines?: ChildVaccineInput[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChildMedicineInput)
    medicines?: ChildMedicineInput[];

    @IsNotEmpty()
    @IsEnum(Sex)
    sex!: 'MALE' | 'FEMALE' ;



}
