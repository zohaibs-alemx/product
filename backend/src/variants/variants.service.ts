import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from 'src/entities/product-variant.entity';
import { Product } from 'src/entities/product.entity';
import { Color } from 'src/entities/color.entity';
import { Size } from 'src/entities/size.entity';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class VariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Color)
    private colorRepository: Repository<Color>,
    @InjectRepository(Size)
    private sizeRepository: Repository<Size>,
  ) {}

  async create(createVariantDto: CreateVariantDto) {
    // Check if product exists
    const product = await this.productRepository.findOne({
      where: { product_id: createVariantDto.product_id },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if color exists
    const color = await this.colorRepository.findOne({
      where: { color_id: createVariantDto.color_id },
    });
    if (!color) {
      throw new NotFoundException('Color not found');
    }

    // Check if size exists
    const size = await this.sizeRepository.findOne({
      where: { size_id: createVariantDto.size_id },
    });
    if (!size) {
      throw new NotFoundException('Size not found');
    }

    // Check if SKU already exists
    const existingVariant = await this.variantRepository.findOne({
      where: { sku: createVariantDto.sku },
    });
    if (existingVariant) {
      throw new ConflictException('Variant with this SKU already exists');
    }

    const variant = this.variantRepository.create({
      ...createVariantDto,
      status: createVariantDto.status || 'active',
      min_stock_level: createVariantDto.min_stock_level || 0,
    });

    return this.variantRepository.save(variant);
  }

  async findAll() {
    return this.variantRepository.find({
      relations: ['product', 'product.brand', 'product.category', 'color', 'size'],
      order: { created_at: 'DESC' },
    });
  }

  async findByProduct(productId: number) {
    const product = await this.productRepository.findOne({
      where: { product_id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.variantRepository.find({
      where: { product_id: productId },
      relations: ['product', 'product.brand', 'product.category', 'color', 'size'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number) {
    const variant = await this.variantRepository.findOne({
      where: { variant_id: id },
      relations: ['product', 'product.brand', 'product.category', 'color', 'size'],
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    return variant;
  }

  async update(id: number, updateVariantDto: UpdateVariantDto) {
    const variant = await this.findOne(id);

    // Validate color if provided
    if (updateVariantDto.color_id) {
      const color = await this.colorRepository.findOne({
        where: { color_id: updateVariantDto.color_id },
      });
      if (!color) {
        throw new NotFoundException('Color not found');
      }
    }

    // Validate size if provided
    if (updateVariantDto.size_id) {
      const size = await this.sizeRepository.findOne({
        where: { size_id: updateVariantDto.size_id },
      });
      if (!size) {
        throw new NotFoundException('Size not found');
      }
    }

    // Check SKU uniqueness if provided
    if (updateVariantDto.sku && updateVariantDto.sku !== variant.sku) {
      const existingVariant = await this.variantRepository.findOne({
        where: { sku: updateVariantDto.sku },
      });
      if (existingVariant) {
        throw new ConflictException('Variant with this SKU already exists');
      }
    }

    Object.assign(variant, updateVariantDto);
    return this.variantRepository.save(variant);
  }

  async remove(id: number) {
    const variant = await this.findOne(id);
    await this.variantRepository.remove(variant);
    return { message: 'Variant deleted successfully' };
  }
}


