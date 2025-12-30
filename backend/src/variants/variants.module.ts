import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VariantsController } from './variants.controller';
import { VariantsService } from './variants.service';
import { ProductVariant } from 'src/entities/product-variant.entity';
import { Product } from 'src/entities/product.entity';
import { Color } from 'src/entities/color.entity';
import { Size } from 'src/entities/size.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductVariant, Product, Color, Size])],
  controllers: [VariantsController],
  providers: [VariantsService],
  exports: [VariantsService],
})
export class VariantsModule {}


