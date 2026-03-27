/**
 * Creado y diseñado por XO
 */
import { Controller, Post, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BlueprintsService } from './blueprints.service';

@Controller('blueprints')
export class BlueprintsController {
  constructor(private readonly blueprintsService: BlueprintsService) {}

  @Post('convert')
  @UseInterceptors(FileInterceptor('file'))
  async convertBlueprint(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('No hay fichero anexado', HttpStatus.BAD_REQUEST);
    }
    
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (ext !== 'dwg' && ext !== 'dxf') {
      throw new HttpException('Formato inválido. Solo se admiten archivos .dwg y .dxf bajo esta ruta.', HttpStatus.BAD_REQUEST);
    }

    const svgResult = await this.blueprintsService.convertToSvg(file);
    return { svg: svgResult, originalName: file.originalname };
  }
}
