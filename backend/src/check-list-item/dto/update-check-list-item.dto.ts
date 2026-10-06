import { PartialType } from '@nestjs/mapped-types';
import { CreateCheckListItemDto } from './create-check-list-item.dto';

export class UpdateCheckListItemDto extends PartialType(CreateCheckListItemDto) {}
