/**
 * Creado y diseñado por XO
 */
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
// import * as dxf from 'dxf';
const dxf = require('dxf');

@Injectable()
export class BlueprintsService {
  private readonly logger = new Logger(BlueprintsService.name);

  async convertToSvg(file: Express.Multer.File): Promise<string> {
    const tmpDir = os.tmpdir();
    const sessionId = Math.random().toString(36).substring(7);
    const originalExt = path.extname(file.originalname).toLowerCase();
    
    const inputPath = path.join(tmpDir, `blueprint_${sessionId}${originalExt}`);
    const dxfPath = originalExt === '.dxf' ? inputPath : path.join(tmpDir, `blueprint_${sessionId}.dxf`);

    try {
      // 1. Escribir archivo temporal subido
      await fs.writeFile(inputPath, file.buffer);

      // 2. Si es formato DWG (AutoCAD cerrado), inyectarlo a LibreDWG (dwg2dxf)
      if (originalExt === '.dwg') {
        this.logger.log(`Convirtiendo DWG a DXF: ${inputPath}`);
        try {
          await execFileAsync('dwg2dxf', ['-m', '-o', dxfPath, inputPath], { timeout: 30000 });
        } catch (execErr: any) {
          this.logger.error('Error dwg2dxf', execErr);
          throw new HttpException('Error de dwg2dxf: el archivo DWG puede estar corrupto o usar una versión muy reciente no soportada.', HttpStatus.BAD_REQUEST);
        }
      }

      // 3. Leer el DXF extraído (o original)
      const dxfContent = await fs.readFile(dxfPath, 'utf8');

      // 4. Transformar los vectores a SVG String usando dxf Helper
      this.logger.log(`Generando geometría SVG desde DXF (${dxfPath})`);
      const helper = new dxf.Helper(dxfContent);
      const svgContent = helper.toSVG();

      if (!svgContent || !svgContent.includes('<svg')) {
         throw new Error('El parseador no pudo generar SVG. Archivo vectorial vacío o binario.');
      }

      return svgContent;

    } catch (err: any) {
      this.logger.error(`Fallo en el pipeline de Blueprint: ${err.message}`);
      if (err instanceof HttpException) throw err;
      throw new HttpException(err.message || 'Error grave al transformar plano crudo a SVG', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      // 5. Limpiar huella temporal del contenedor
      fs.unlink(inputPath).catch(() => {});
      if (inputPath !== dxfPath) fs.unlink(dxfPath).catch(() => {});
    }
  }
}
