import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from 'src/entities/stock.entity';
import { Location } from 'src/entities/location.entity';
import { ProductVariant } from 'src/entities/product-variant.entity';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
  ) {}

  async create(createStockDto: CreateStockDto) {
    // Check if location exists
    const location = await this.locationRepository.findOne({
      where: { location_id: createStockDto.location_id },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Check if variant exists
    const variant = await this.variantRepository.findOne({
      where: { variant_id: createStockDto.variant_id },
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    // Check if stock already exists for this location and variant
    const existingStock = await this.stockRepository.findOne({
      where: {
        location_id: createStockDto.location_id,
        variant_id: createStockDto.variant_id,
      },
    });

    if (existingStock) {
      throw new ConflictException(
        'Stock already exists for this location and variant',
      );
    }

    const stock = this.stockRepository.create({
      ...createStockDto,
      quantity_reserved: createStockDto.quantity_reserved || 0,
    });

    return this.stockRepository.save(stock);
  }

  async findAll() {
    return this.stockRepository.find({
      relations: ['location', 'variant', 'variant.product', 'variant.product.brand', 'variant.product.category', 'variant.color', 'variant.size'],
      order: { last_updated_at: 'DESC' },
    });
  }

  async findByLocation(locationId: number) {
    const location = await this.locationRepository.findOne({
      where: { location_id: locationId },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return this.stockRepository.find({
      where: { location_id: locationId },
      relations: ['location', 'variant', 'variant.product', 'variant.product.brand', 'variant.product.category', 'variant.color', 'variant.size'],
      order: { last_updated_at: 'DESC' },
    });
  }

  async findByVariant(variantId: number) {
    const variant = await this.variantRepository.findOne({
      where: { variant_id: variantId },
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    return this.stockRepository.find({
      where: { variant_id: variantId },
      relations: ['location', 'variant', 'variant.product', 'variant.product.brand', 'variant.product.category', 'variant.color', 'variant.size'],
      order: { last_updated_at: 'DESC' },
    });
  }

  async findByProduct(productId: number) {
    // Get all variants for this product
    const variants = await this.variantRepository.find({
      where: { product_id: productId },
    });

    if (variants.length === 0) {
      return [];
    }

    const variantIds = variants.map((v) => v.variant_id);

    return this.stockRepository
      .createQueryBuilder('stock')
      .where('stock.variant_id IN (:...variantIds)', { variantIds })
      .leftJoinAndSelect('stock.location', 'location')
      .leftJoinAndSelect('stock.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.color', 'color')
      .leftJoinAndSelect('variant.size', 'size')
      .orderBy('stock.last_updated_at', 'DESC')
      .getMany();
  }

  async findBySupplier(supplierId: number) {
    // This would require purchase orders to track supplier relationships
    // For now, return all stock (can be enhanced later with PO tracking)
    return this.findAll();
  }

  async findOne(locationId: number, variantId: number) {
    const stock = await this.stockRepository.findOne({
      where: {
        location_id: locationId,
        variant_id: variantId,
      },
      relations: ['location', 'variant', 'variant.product', 'variant.product.brand', 'variant.product.category', 'variant.color', 'variant.size'],
    });

    if (!stock) {
      throw new NotFoundException(
        'Stock not found for this location and variant',
      );
    }

    return stock;
  }

  async update(locationId: number, variantId: number, updateStockDto: UpdateStockDto) {
    const stock = await this.findOne(locationId, variantId);

    Object.assign(stock, updateStockDto);
    return this.stockRepository.save(stock);
  }

  async adjustStock(
    locationId: number,
    variantId: number,
    adjustStockDto: AdjustStockDto,
  ) {
    const stock = await this.findOne(locationId, variantId);

    switch (adjustStockDto.type) {
      case 'add':
        stock.quantity_on_hand += adjustStockDto.quantity;
        break;
      case 'subtract':
        if (stock.quantity_on_hand < adjustStockDto.quantity) {
          throw new BadRequestException('Insufficient stock');
        }
        stock.quantity_on_hand -= adjustStockDto.quantity;
        break;
      case 'set':
        stock.quantity_on_hand = adjustStockDto.quantity;
        break;
      default:
        throw new BadRequestException('Invalid adjustment type');
    }

    return this.stockRepository.save(stock);
  }

  async remove(locationId: number, variantId: number) {
    const stock = await this.findOne(locationId, variantId);
    await this.stockRepository.remove(stock);
    return { message: 'Stock entry deleted successfully' };
  }

  // Helper method to get stock summary
  async getStockSummary() {
    const allStock = await this.findAll();
    
    const totalItems = allStock.length;
    const lowStockItems = allStock.filter((stock) => {
      const minLevel = stock.variant.min_stock_level || 0;
      return stock.quantity_on_hand <= minLevel;
    }).length;

    const totalValue = allStock.reduce((sum, stock) => {
      const value = stock.quantity_on_hand * (stock.variant.cost_price || 0);
      return sum + value;
    }, 0);

    return {
      totalItems,
      lowStockItems,
      totalValue,
    };
  }
}

