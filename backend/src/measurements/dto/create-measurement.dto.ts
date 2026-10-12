import { IsNumber, IsPositive, IsDateString, IsNotEmpty, IsInt, IsOptional, Min, Max } from 'class-validator';


export class CreateMeasurementDto {

    @IsNotEmpty({ message: 'El ID del menor es obligatorio' })
    @IsInt()
    @IsPositive()
    childId!:number;

    @IsNotEmpty({ message: 'La fecha es obligatoria'})
    @IsDateString({}, { message: 'La fecha debe tener un formato válido (ej. 2026-10-07)' })
    date!:string;

    @IsOptional()
    @IsNumber({}, { message: 'El peso debe ser un número válido' })
    @IsPositive({ message: 'El peso debe ser positivo' })
    @Min(0.5, { message: 'El peso debe ser de al menos 0.5 kg' })
    @Max(80, { message: 'El peso no puede superar los 80 kg' })
    weight?: number;

    @IsOptional()
    @IsNumber({}, { message: 'La altura debe ser un número válido' })
    @IsPositive({ message: 'La altura debe ser positiva' })
    @Min(20, { message: 'La altura debe ser de al menos 20 cm' })
    @Max(180, { message: 'La altura no puede superar los 180 cm' })
    height?: number;
}

