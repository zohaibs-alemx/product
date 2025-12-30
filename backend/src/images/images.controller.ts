import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFiles,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ImagesService } from './images.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('images')
@UseGuards(JwtAuthGuard)
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user: any,
    @Body('entity_type') entityType: string,
    @Body('entity_id') entityId: string,
    @Body('image_type') imageType?: string,
    @Body('alt_text') altText?: string,
  ) {
    const entityIdNum = parseInt(entityId);
    const userId = user.user_id;

    if (files.length === 1) {
      return this.imagesService.uploadImage(
        files[0],
        entityType,
        entityIdNum,
        userId,
        imageType || 'main',
        true,
        altText,
      );
    }

    return this.imagesService.uploadMultipleImages(
      files,
      entityType,
      entityIdNum,
      userId,
    );
  }

  @Get(':entityType/:entityId')
  async getImagesByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
  ) {
    return this.imagesService.getImagesByEntity(entityType, entityId);
  }

  @Delete(':id')
  async deleteImage(@Param('id', ParseIntPipe) id: number) {
    return this.imagesService.deleteImage(id);
  }

  @Post(':id/set-primary')
  async setPrimaryImage(
    @Param('id', ParseIntPipe) id: number,
    @Body('entity_type') entityType: string,
    @Body('entity_id') entityId: number,
  ) {
    return this.imagesService.setPrimaryImage(id, entityType, entityId);
  }
}

