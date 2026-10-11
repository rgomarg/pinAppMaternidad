import { IsNumber, IsPositive, IsDateString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';


export class CreateMeasurementDto {

    @IsNotEmpty({ message: 'El ID del menor es obligatorio' })
    @IsInt()
    @IsPositive()
    childId!:number;

    @IsNotEmpty({ message: 'La fecha es obligatoria'})
    @IsDateString({}, { message: 'La fecha debe tener un formato válido (ej. 2026-10-07)' })
    date!:string;

    @IsOptional({message: 'El peso es obligatorio'})
    @IsNumber()
    @IsPositive({message: 'El peso debe ser positivo'})
    weight?: number;

    @IsOptional({message: 'La altura es obligatoria'})
    @IsNumber()
    @IsPositive({message: 'La altura debe ser positiva'})
    height?: number;
}

