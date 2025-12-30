import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { Sale } from 'src/entities/sale.entity';
import { SaleLine } from 'src/entities/sale-line.entity';
import { Payment } from 'src/entities/payment.entity';
import { Stock } from 'src/entities/stock.entity';
import { Location } from 'src/entities/location.entity';
import { Customer } from 'src/entities/customer.entity';
import { ProductVariant } from 'src/entities/product-variant.entity';
import { Product } from 'src/entities/product.entity';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleLine,
      Payment,
      Stock,
      Location,
      Customer,
      ProductVariant,
      Product,
    ]),
    PassportModule,
    CustomersModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}

