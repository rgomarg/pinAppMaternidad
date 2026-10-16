import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVaccineDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsInt()
  childId!: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  appliedAt?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledFor?: Date | null;
}
