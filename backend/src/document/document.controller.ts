import { Controller, Get, Post, Delete, Param, Body, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { uploadDir } from './upload-dir';
import { DocumentService } from './document.service';

@Controller('document')
export class DocumentController {
  constructor(private readonly svc: DocumentService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: uploadDir,
      filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/${file.filename}`, filename: file.filename, originalName: file.originalname };
  }

  @Get('types')
  getTypes() {
    return this.svc.getTypes();
  }

  @Get('property')
  getPropertyDocuments(@Query('property_id') propertyId: string) {
    return this.svc.getPropertyDocuments(parseInt(propertyId, 10));
  }

  @Post('property')
  addPropertyDocument(@Body() body: { property_id: number; document_type: number; document: string }) {
    return this.svc.addPropertyDocument(body);
  }

  @Delete('property/:id')
  removePropertyDocument(@Param('id') id: string) {
    return this.svc.removePropertyDocument(parseInt(id, 10));
  }
}
