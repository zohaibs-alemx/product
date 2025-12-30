import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductsService } from './products.service';
import { ProductsController } from '../products.controller';
import { Product } from 'src/entities/product.entity';
import { ImagesModule } from 'src/images/images.module';


@Module({
  imports: [TypeOrmModule.forFeature([Product]), ImagesModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}



