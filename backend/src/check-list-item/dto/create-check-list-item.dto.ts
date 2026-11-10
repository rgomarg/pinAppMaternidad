import { IsInt, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateCheckListItemDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  title!: string;

  @IsInt()
  childId!: number;

  @IsInt()
  userId!: number;
}
