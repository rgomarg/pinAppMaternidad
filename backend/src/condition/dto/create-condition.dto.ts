import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { TagCondition } from '@prisma/client';

export class CreateConditionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(TagCondition, { each: true })
  tag!: TagCondition[];

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  timestamp!: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsInt()
  @IsNotEmpty()
  childId!: number;
}
