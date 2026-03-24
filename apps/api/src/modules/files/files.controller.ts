import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Define the upload directory.
// Ideally, this should come from configuration, but for Phase 1 we use a local 'uploads' folder.
const UPLOAD_DIR = './uploads';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (req, file, cb) => {
          // Generate a random filename to avoid collisions
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    console.log('Upload Request Received');
    console.log('User:', user);
    console.log('File:', file);

    if (!file) {
      throw new Error('File is undefined in controller');
    }
    if (!user) {
      throw new Error('User is undefined in controller');
    }

    try {
      const savedFile = await this.filesService.saveFileRecord(file, user.id);
      return savedFile;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  @Get(':id')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const fileRecord = await this.filesService.getFile(id);
    if (!fileRecord) {
      throw new NotFoundException('File not found');
    }

    const filePath = join(process.cwd(), fileRecord.storagePath);

    if (!existsSync(filePath)) {
      throw new NotFoundException('Physical file not found');
    }

    // Set headers
    res.set({
      'Content-Type': fileRecord.mimeType,
      'Content-Disposition': `inline; filename="${fileRecord.originalName}"`,
    });

    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);
  }
}
