import { Type } from 'class-transformer/types/decorators/type.decorator';
import { IsNotEmpty, IsString, IsOptional, IsDate } from 'class-validator';


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
}
