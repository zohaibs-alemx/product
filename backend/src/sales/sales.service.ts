import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { SaleLine } from 'src/entities/sale-line.entity';
import { Payment } from 'src/entities/payment.entity';
import { Stock } from 'src/entities/stock.entity';
import { Location } from 'src/entities/location.entity';
import { Customer } from 'src/entities/customer.entity';
import { ProductVariant } from 'src/entities/product-variant.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Sale } from 'src/entities/sale.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(SaleLine)
    private saleLineRepository: Repository<SaleLine>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    private dataSource: DataSource,
  ) {}

  async create(
    createSaleDto: CreateSaleDto,
    createdBy: number,
    userType: 'customer' | 'staff' | 'guest' = 'staff',
  ) {
    // Validate location exists
    const location = await this.locationRepository.findOne({
      where: { location_id: createSaleDto.location_id },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Validate customer if provided (optional for guest checkout)
    if (createSaleDto.customer_id) {
      const customer = await this.customerRepository.findOne({
        where: { customer_id: createSaleDto.customer_id },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }
    // If no customer_id provided, it's a guest sale (customer_id will be null)

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Use transaction to ensure data consistency
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate stock availability and calculate totals
      let subtotal = 0;
      const saleLines: SaleLine[] = [];

      for (const lineDto of createSaleDto.lines) {
        // Validate variant exists
        const variant = await queryRunner.manager.findOne(ProductVariant, {
          where: { variant_id: lineDto.variant_id },
          relations: ['product'],
        });
        if (!variant) {
          throw new NotFoundException(
            `Variant with ID ${lineDto.variant_id} not found`,
          );
        }

        // Check stock availability
        const stock = await queryRunner.manager.findOne(Stock, {
          where: {
            location_id: createSaleDto.location_id,
            variant_id: lineDto.variant_id,
          },
        });

        if (!stock) {
          throw new BadRequestException(
            `No stock available for variant ${lineDto.variant_id} at location ${createSaleDto.location_id}`,
          );
        }

        const availableQty =
          stock.quantity_on_hand - stock.quantity_reserved;
        if (availableQty < lineDto.quantity) {
          throw new BadRequestException(
            `Insufficient stock for variant ${lineDto.variant_id}. Available: ${availableQty}, Requested: ${lineDto.quantity}`,
          );
        }

        // Calculate line totals
        const lineSubtotal = lineDto.unit_price * lineDto.quantity;
        const lineDiscount = lineDto.discount || 0;
        const lineTaxRate = lineDto.tax_rate || (variant.product ? Number(variant.product.default_tax_rate) : 0);
        const lineAfterDiscount = lineSubtotal - lineDiscount;
        const lineTax = lineAfterDiscount * (lineTaxRate / 100);
        const lineTotal = lineAfterDiscount + lineTax;

        subtotal += lineTotal;

        // Create sale line (will be saved with sale due to cascade)
        const saleLine = queryRunner.manager.create(SaleLine, {
          variant_id: lineDto.variant_id,
          quantity: lineDto.quantity,
          unit_price: lineDto.unit_price,
          discount: lineDiscount,
          tax_rate: lineTaxRate,
        });
        saleLines.push(saleLine);

        // Deduct stock
        stock.quantity_on_hand -= lineDto.quantity;
        await queryRunner.manager.save(Stock, stock);
      }

      // Calculate final totals
      const discountAmount = createSaleDto.discount_amount || 0;
      // Calculate subtotal before tax (sum of all line totals before tax)
      const subtotalBeforeTax = saleLines.reduce((sum, line) => {
        const lineSubtotal = line.unit_price * line.quantity;
        const lineDiscount = line.discount || 0;
        return sum + (lineSubtotal - lineDiscount);
      }, 0);
      
      // Calculate total tax
      const taxAmount = saleLines.reduce((sum, line) => {
        const lineSubtotal = line.unit_price * line.quantity;
        const lineDiscount = line.discount || 0;
        const lineAfterDiscount = lineSubtotal - lineDiscount;
        return sum + (lineAfterDiscount * ((line.tax_rate || 0) / 100));
      }, 0);
      
      // Apply sale-level discount
      const finalSubtotal = subtotalBeforeTax - discountAmount;
      const totalAmount = finalSubtotal + taxAmount;

      // Create sale
      // For customers, created_by uses customer_id; for staff, uses user_id
      const sale = queryRunner.manager.create(Sale, {
        invoice_number: invoiceNumber,
        sale_date: new Date(createSaleDto.sale_date),
        location_id: createSaleDto.location_id,
        customer_id: createSaleDto.customer_id,
        subtotal_amount: finalSubtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        payment_status: 'unpaid',
        created_by: createdBy, // customer_id for customers, user_id for staff
        lines: saleLines,
      });

      const savedSale = await queryRunner.manager.save(Sale, sale);

      await queryRunner.commitTransaction();

      // Return sale with relations
      return this.findOne(savedSale.sale_id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return this.saleRepository.find({
      relations: [
        'location',
        'customer',
        'creator',
        'lines',
        'lines.variant',
        'lines.variant.product',
        'lines.variant.color',
        'lines.variant.size',
        'payments',
        'payments.receiver',
      ],
      order: { sale_date: 'DESC', created_at: 'DESC' },
    });
  }

  async findOne(id: number) {
    const sale = await this.saleRepository.findOne({
      where: { sale_id: id },
      relations: [
        'location',
        'customer',
        'creator',
        'lines',
        'lines.variant',
        'lines.variant.product',
        'lines.variant.color',
        'lines.variant.size',
        'payments',
        'payments.receiver',
      ],
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    return sale;
  }

  async findByCustomer(customerId: number) {
    const customer = await this.customerRepository.findOne({
      where: { customer_id: customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.saleRepository.find({
      where: { customer_id: customerId },
      relations: [
        'location',
        'lines',
        'lines.variant',
        'payments',
      ],
      order: { sale_date: 'DESC' },
    });
  }

  async findByLocation(locationId: number) {
    const location = await this.locationRepository.findOne({
      where: { location_id: locationId },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return this.saleRepository.find({
      where: { location_id: locationId },
      relations: [
        'customer',
        'lines',
        'lines.variant',
        'payments',
      ],
      order: { sale_date: 'DESC' },
    });
  }

  async addPayment(saleId: number, createPaymentDto: CreatePaymentDto, receivedBy: number) {
    const sale = await this.findOne(saleId);

    // Calculate total paid amount
    const existingPayments = sale.payments || [];
    const totalPaid = existingPayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );
    const newTotalPaid = totalPaid + createPaymentDto.amount;

    // Validate payment amount
    if (newTotalPaid > sale.total_amount) {
      throw new BadRequestException(
        `Payment amount exceeds total amount. Total: ${sale.total_amount}, Already paid: ${totalPaid}, New payment: ${createPaymentDto.amount}`,
      );
    }

    // Create payment
    const payment = this.paymentRepository.create({
      sale_id: saleId,
      payment_date: new Date(createPaymentDto.payment_date),
      payment_method: createPaymentDto.payment_method,
      amount: createPaymentDto.amount,
      reference_number: createPaymentDto.reference_number,
      received_by: receivedBy,
    });

    await this.paymentRepository.save(payment);

    // Update payment status
    let paymentStatus: 'paid' | 'partial' | 'unpaid';
    if (newTotalPaid >= sale.total_amount) {
      paymentStatus = 'paid';
    } else if (newTotalPaid > 0) {
      paymentStatus = 'partial';
    } else {
      paymentStatus = 'unpaid';
    }

    sale.payment_status = paymentStatus;
    await this.saleRepository.save(sale);

    return this.findOne(saleId);
  }

  async findOneForCustomer(saleId: number, customerId: number) {
    const sale = await this.findOne(saleId);
    if (sale.customer_id !== customerId) {
      throw new NotFoundException('Sale not found');
    }
    return sale;
  }

  async addPaymentForCustomer(
    saleId: number,
    createPaymentDto: CreatePaymentDto,
    customerId: number,
  ) {
    const sale = await this.findOne(saleId);
    if (sale.customer_id !== customerId) {
      throw new NotFoundException('Sale not found');
    }
    // For customer payments, use customer_id as received_by
    return this.addPayment(saleId, createPaymentDto, customerId);
  }

  async remove(saleId: number) {
    const sale = await this.findOne(saleId);

    if (sale.payment_status === 'paid' || sale.payment_status === 'partial') {
      throw new BadRequestException(
        'Cannot delete sale with payments. Process a refund first.',
      );
    }

    // Use transaction to restore stock
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Restore stock for each line
      for (const line of sale.lines) {
        const stock = await queryRunner.manager.findOne(Stock, {
          where: {
            location_id: sale.location_id,
            variant_id: line.variant_id,
          },
        });

        if (stock) {
          stock.quantity_on_hand += line.quantity;
          await queryRunner.manager.save(Stock, stock);
        }
      }

      // Delete sale (cascade will delete lines and payments)
      await queryRunner.manager.remove(Sale, sale);

      await queryRunner.commitTransaction();
      return { message: 'Sale deleted and stock restored successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    // Get count of sales today
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.saleRepository
      .createQueryBuilder('sale')
      .where('sale.created_at >= :startOfDay', { startOfDay })
      .andWhere('sale.created_at <= :endOfDay', { endOfDay })
      .getCount();

    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
  }
}

