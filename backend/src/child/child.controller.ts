import { Controller, Get, Post, Body, Patch, Param, Delete, StreamableFile } from '@nestjs/common';
import { ChildService } from './child.service';
import { ChildExportService } from './child-export.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Controller('child')
export class ChildController {
  constructor(
    private readonly childService: ChildService,
    private readonly childExportService: ChildExportService,
  ) {}

  @Post()
  create(@Body() createChildDto: CreateChildDto) {
    return this.childService.create(createChildDto); 
  }

  @Get()
  findAll() {
    return this.childService.findAll();
  }

  @Get(':id/dashboard')
  getDashboard(@Param('id') id: string) {
    return this.childService.getDashboardData(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.childService.findOne(+id);
  }
  @Get(':id/export')
  async exportData(@Param('id') id: string) {
    const pdf = await this.childExportService.generatePdf(+id);
    return new StreamableFile(pdf.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(`${pdf.childName}-Informe.pdf`)}`,

    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateChildDto: UpdateChildDto) {
    return this.childService.update(+id, updateChildDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.childService.remove(+id);
  }
}
