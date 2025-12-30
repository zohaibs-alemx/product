import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from 'src/entities/order.entity';
import { OrderLine } from 'src/entities/order-line.entity';
import { Stock } from 'src/entities/stock.entity';
import { Customer } from 'src/entities/customer.entity';
import { ProductVariant } from 'src/entities/product-variant.entity';
import { Product } from 'src/entities/product.entity';
import { Sale } from 'src/entities/sale.entity';
import { SaleLine } from 'src/entities/sale-line.entity';
import { Location } from 'src/entities/location.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderLine,
      Stock,
      Location,
      Customer,
      ProductVariant,
      Product,
      Sale,
      SaleLine,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}


