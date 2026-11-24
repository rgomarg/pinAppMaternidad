import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
    @IsString() @IsNotEmpty() 
    title!: string;
    @IsString() @IsNotEmpty() 
    body!: string;
    @Type(() => Date) @IsDate() 
    scheduledAt!: Date;
    @Type(() => Number) @IsInt() 
    userId!: number;
    @IsOptional() @IsEnum(NotificationType) 
    type?: NotificationType;
    @IsOptional() @IsInt() 
    eventId?: number;
    @IsOptional() @IsInt() 
    vaccineId?: number;
    @IsOptional() @IsInt() 
    medicineId?: number;
    @IsOptional() @IsObject() 
    data?: any;
}