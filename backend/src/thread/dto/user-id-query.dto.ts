import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

// ?userId= del usuario que hace la petición (sustituto temporal de la auth)
export class UserIdQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    userId?: number;
}
