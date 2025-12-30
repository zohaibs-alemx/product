import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Image } from 'src/entities/image.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ImagesService {
  private readonly uploadPath = path.join(process.cwd(), 'uploads');

  constructor(
    @InjectRepository(Image)
    private imageRepository: Repository<Image>,
  ) {
    // Create uploads directory if it doesn't exist
    this.ensureUploadDirectory();
  }

  private ensureUploadDirectory() {
    const dirs = [
      this.uploadPath,
      path.join(this.uploadPath, 'products'),
      path.join(this.uploadPath, 'variants'),
      path.join(this.uploadPath, 'brands'),
    ];

    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    entityType: string,
    entityId: number,
    userId: number,
    imageType: string = 'main',
    isPrimary: boolean = false,
    altText?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${entityType}_${entityId}_${timestamp}${ext}`;
    const filePath = path.join(this.uploadPath, `${entityType}s`, filename);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Create database record
    const image = this.imageRepository.create({
      entity_type: entityType,
      entity_id: entityId,
      image_path: `/uploads/${entityType}s/${filename}`,
      image_url: `http://localhost:5500/uploads/${entityType}s/${filename}`,
      image_type: imageType,
      display_order: 0,
      alt_text: altText || file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
      is_primary: isPrimary,
      uploaded_by: userId,
    });

    return this.imageRepository.save(image);
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    entityType: string,
    entityId: number,
    userId: number,
  ) {
    if (!files || files.length === 0) {
      return [];
    }

    const uploadedImages: Image[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPrimary = i === 0; // First image is primary

      const image = await this.uploadImage(
        file,
        entityType,
        entityId,
        userId,
        isPrimary ? 'main' : 'gallery',
        isPrimary,
      );

      // Update display order
      image.display_order = i;
      await this.imageRepository.save(image);

      uploadedImages.push(image);
    }

    return uploadedImages;
  }

  async getImagesByEntity(entityType: string, entityId: number) {
    return this.imageRepository.find({
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
      order: {
        display_order: 'ASC',
        is_primary: 'DESC',
      },
    });
  }

  async deleteImage(imageId: number) {
    const image = await this.imageRepository.findOne({
      where: { image_id: imageId },
    });

    if (!image) {
      throw new BadRequestException('Image not found');
    }

    // Delete file
    const filePath = path.join(process.cwd(), image.image_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.imageRepository.remove(image);
    return { message: 'Image deleted successfully' };
  }

  async setPrimaryImage(imageId: number, entityType: string, entityId: number) {
    // Set all images of this entity to not primary
    await this.imageRepository.update(
      {
        entity_type: entityType,
        entity_id: entityId,
      },
      { is_primary: false },
    );

    // Set this image as primary
    await this.imageRepository.update(
      { image_id: imageId },
      { is_primary: true },
    );

    return { message: 'Primary image updated' };
  }
}

