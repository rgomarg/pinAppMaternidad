import { Injectable } from '@nestjs/common';
import { CreateCheckListItemDto } from './dto/create-check-list-item.dto';
import { UpdateCheckListItemDto } from './dto/update-check-list-item.dto';

@Injectable()
export class CheckListItemService {
  create(createCheckListItemDto: CreateCheckListItemDto) {
    return 'This action adds a new checkListItem';
  }

  findAll() {
    return `This action returns all checkListItem`;
  }

  findOne(id: number) {
    return `This action returns a #${id} checkListItem`;
  }

  update(id: number, updateCheckListItemDto: UpdateCheckListItemDto) {
    return `This action updates a #${id} checkListItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} checkListItem`;
  }
}
