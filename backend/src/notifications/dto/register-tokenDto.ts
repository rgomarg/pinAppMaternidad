import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class RegisterTokenDto {
    @Type(() => Number)
    @IsInt()
    userId!: number;

    @IsString()
    @IsNotEmpty()
    pushToken!: string;
}