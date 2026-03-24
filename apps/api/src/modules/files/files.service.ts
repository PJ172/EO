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
}
