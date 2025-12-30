import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('stock')
@UseGuards(JwtAuthGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  create(@Body() createStockDto: CreateStockDto) {
    return this.stockService.create(createStockDto);
  }

  @Get()
  getSummary() {
    return this.stockService.getStockSummary();
  }

  @Get('all')
  findAll() {
    return this.stockService.findAll();
  }

  @Get('location/:locationId')
  findByLocation(@Param('locationId', ParseIntPipe) locationId: number) {
    return this.stockService.findByLocation(locationId);
  }

  @Get('variant/:variantId')
  findByVariant(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.stockService.findByVariant(variantId);
  }

  @Get('product/:productId')
  findByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.stockService.findByProduct(productId);
  }

  @Get('supplier/:supplierId')
  findBySupplier(@Param('supplierId', ParseIntPipe) supplierId: number) {
    return this.stockService.findBySupplier(supplierId);
  }

  @Get(':locationId/:variantId')
  findOne(
    @Param('locationId', ParseIntPipe) locationId: number,
    @Param('variantId', ParseIntPipe) variantId: number,
  ) {
    return this.stockService.findOne(locationId, variantId);
  }

  @Patch(':locationId/:variantId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  update(
    @Param('locationId', ParseIntPipe) locationId: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.stockService.update(locationId, variantId, updateStockDto);
  }

  @Post(':locationId/:variantId/adjust')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  adjustStock(
    @Param('locationId', ParseIntPipe) locationId: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() adjustStockDto: AdjustStockDto,
  ) {
    return this.stockService.adjustStock(locationId, variantId, adjustStockDto);
  }

  @Delete(':locationId/:variantId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(
    @Param('locationId', ParseIntPipe) locationId: number,
    @Param('variantId', ParseIntPipe) variantId: number,
  ) {
    return this.stockService.remove(locationId, variantId);
  }
}

