import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from 'src/entities/product.entity';
import { CreateProductDto } from 'src/products/dto/create-product.dto';
import { UpdateProductDto } from 'src/products/dto/update-product.dto';
import { ImagesService } from 'src/images/images.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private imagesService: ImagesService,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const product = this.productRepository.create({
      ...createProductDto,
      status: (createProductDto.status as 'active' | 'discontinued') || 'active',
    });
    return this.productRepository.save(product);
  }

  async findAll() {
    const products = await this.productRepository.find({
      relations: ['brand', 'category', 'subcategory', 'variants'],
      order: { created_at: 'DESC' },
    });

    // Load images for each product
    for (const product of products) {
      const images = await this.imagesService.getImagesByEntity('product', product.product_id);
      (product as any).images = images;
    }

    return products;
  }

  async findOne(id: number) {
    const product = await this.productRepository.findOne({
      where: { product_id: id },
      relations: ['brand', 'category', 'subcategory', 'variants'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Load images for this product
    const images = await this.imagesService.getImagesByEntity('product', id);
    (product as any).images = images;

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(id: number) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
    return { message: 'Product deleted successfully' };
  }

  async addImages(
    productId: number,
    files: Express.Multer.File[],
    userId: number,
  ) {
    await this.findOne(productId); // Verify product exists
    return this.imagesService.uploadMultipleImages(
      files,
      'product',
      productId,
      userId,
    );
  }

  async getProductImages(productId: number) {
    return this.imagesService.getImagesByEntity('product', productId);
  }
}

