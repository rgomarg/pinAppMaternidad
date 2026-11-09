import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
        return value.trim();
    }
    return value;
};
export class CreateReportDto {
    @IsIn(['THREAD', 'MESSAGE'])
    targetType!: 'THREAD' | 'MESSAGE';

    @Type(() => Number)
    @IsInt()
    targetId!: number;

    // Sin auth todavía: el front envía el usuario seleccionado
    @Type(() => Number)
    @IsInt()
    reporterId!: number;

    @Transform(trim)
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    comment!: string;
}
