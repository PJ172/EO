import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async saveFileRecord(file: Express.Multer.File, userId: string) {
    return this.prisma.file.create({
      data: {
        storagePath: file.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedById: userId,
      },
    });
  }

  async getFile(id: string) {
    return this.prisma.file.findUnique({
      where: { id },
    });
  }

  async moveOldFile(fileId: string, folder: string) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) return;

    try {
      const fs = await import('fs');
      const path = await import('path');
      const oldPath = path.join(process.cwd(), file.storagePath);

      if (fs.existsSync(oldPath)) {
        const destFolder = path.join('./uploads', folder, 'old');
        if (!fs.existsSync(destFolder)) {
          fs.mkdirSync(destFolder, { recursive: true });
        }
        
        const filename = path.basename(file.storagePath);
        const newPath = path.join(destFolder, filename);
        
        fs.renameSync(oldPath, newPath);
        
        // Update DB
        await this.prisma.file.update({
          where: { id: fileId },
          data: { storagePath: path.join('uploads', folder, 'old', filename).replace(/\\/g, '/') },
        });
      }
    } catch (e) {
      console.error('Failed to move old file', e);
    }
  }
}
