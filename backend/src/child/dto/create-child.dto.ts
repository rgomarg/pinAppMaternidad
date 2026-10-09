import { IsNotEmpty, IsString, IsOptional, IsDate } from 'class-validator';


export class CreateChildDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsDate()
    birthDate!: Date;

    @IsOptional()
    @IsString()
    bloodGroup?: string;

    @IsOptional()
    @IsString()
    allergies?: string;
}
