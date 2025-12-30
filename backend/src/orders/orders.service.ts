import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from 'src/entities/order.entity';
import { OrderLine } from 'src/entities/order-line.entity';
import { Stock } from 'src/entities/stock.entity';
import { Location } from 'src/entities/location.entity';
import { Customer } from 'src/entities/customer.entity';
import { ProductVariant } from 'src/entities/product-variant.entity';
import { Sale } from 'src/entities/sale.entity';
import { SaleLine } from 'src/entities/sale-line.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderLine)
    private orderLineRepository: Repository<OrderLine>,
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    private dataSource: DataSource,
  ) {}

  // Create order (cart) - No stock deduction yet
  async create(createOrderDto: CreateOrderDto, customerId?: number) {
    // Validate location
    const location = await this.locationRepository.findOne({
      where: { location_id: createOrderDto.location_id },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Validate customer if provided
    if (createOrderDto.customer_id || customerId) {
      const customer = await this.customerRepository.findOne({
        where: { customer_id: createOrderDto.customer_id || customerId },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Calculate totals
    let subtotal = 0;
    const orderLines: OrderLine[] = [];

    for (const lineDto of createOrderDto.lines) {
      // Validate variant exists
      const variant = await this.variantRepository.findOne({
        where: { variant_id: lineDto.variant_id },
        relations: ['product'],
      });
      if (!variant) {
        throw new NotFoundException(
          `Variant with ID ${lineDto.variant_id} not found`,
        );
      }

      // Check stock availability (but don't deduct yet)
      const stock = await this.stockRepository.findOne({
        where: {
          location_id: createOrderDto.location_id,
          variant_id: lineDto.variant_id,
        },
      });

      if (!stock) {
        throw new BadRequestException(
          `No stock available for variant ${lineDto.variant_id} at location ${createOrderDto.location_id}`,
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

      // Create order line
      const orderLine = this.orderLineRepository.create({
        variant_id: lineDto.variant_id,
        quantity: lineDto.quantity,
        unit_price: lineDto.unit_price,
        discount: lineDiscount,
        tax_rate: lineTaxRate,
      });
      orderLines.push(orderLine);
    }

    // Calculate final totals
    const discountAmount = createOrderDto.discount_amount || 0;
    const subtotalBeforeTax = orderLines.reduce((sum, line) => {
      const lineSubtotal = line.unit_price * line.quantity;
      const lineDiscount = line.discount || 0;
      return sum + (lineSubtotal - lineDiscount);
    }, 0);

    const taxAmount = orderLines.reduce((sum, line) => {
      const lineSubtotal = line.unit_price * line.quantity;
      const lineDiscount = line.discount || 0;
      const lineAfterDiscount = lineSubtotal - lineDiscount;
      return sum + (lineAfterDiscount * ((line.tax_rate || 0) / 100));
    }, 0);

    const finalSubtotal = subtotalBeforeTax - discountAmount;
    const totalAmount = finalSubtotal + taxAmount;

    // Create order (status: pending - no stock reserved yet)
    const order = this.orderRepository.create({
      order_number: orderNumber,
      order_date: new Date(createOrderDto.order_date),
      location_id: createOrderDto.location_id,
      customer_id: createOrderDto.customer_id || customerId,
      order_type: createOrderDto.order_type || 'online',
      subtotal_amount: finalSubtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      payment_method: createOrderDto.payment_method,
      shipping_address: createOrderDto.shipping_address,
      notes: createOrderDto.notes,
      status: 'pending',
      payment_status: 'pending',
      lines: orderLines,
    });

    return this.orderRepository.save(order);
  }

  // Confirm order - Reserve stock and update status
  async confirmOrder(orderId: number, confirmOrderDto: ConfirmOrderDto) {
    const order = await this.findOne(orderId);

    if (order.status !== 'pending') {
      throw new BadRequestException(
        `Order ${order.order_number} is already ${order.status}`,
      );
    }

    // Use transaction to reserve stock
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Reserve stock for each line
      for (const line of order.lines) {
        const stock = await queryRunner.manager.findOne(Stock, {
          where: {
            location_id: order.location_id,
            variant_id: line.variant_id,
          },
        });

        if (!stock) {
          throw new NotFoundException(
            `Stock not found for variant ${line.variant_id}`,
          );
        }

        const availableQty =
          stock.quantity_on_hand - stock.quantity_reserved;
        if (availableQty < line.quantity) {
          throw new BadRequestException(
            `Insufficient stock for variant ${line.variant_id}. Available: ${availableQty}, Requested: ${line.quantity}`,
          );
        }

        // Reserve stock
        stock.quantity_reserved += line.quantity;
        await queryRunner.manager.save(Stock, stock);
      }

      // Update order status
      order.status = 'confirmed';
      order.payment_method = confirmOrderDto.payment_method;
      order.shipping_address = confirmOrderDto.shipping_address;
      order.notes = confirmOrderDto.notes;

      await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();

      return this.findOne(orderId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Process payment and convert order to sale
  async processPayment(orderId: number, paymentData: any) {
    const order = await this.findOne(orderId);

    if (order.status !== 'confirmed') {
      throw new BadRequestException(
        `Order ${order.order_number} must be confirmed before payment`,
      );
    }

    if (order.payment_status === 'paid') {
      throw new ConflictException(`Order ${order.order_number} is already paid`);
    }

    // Use transaction to convert order to sale and deduct stock
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Create sale lines from order lines
      const saleLines: any[] = [];
      for (const orderLine of order.lines) {
        const saleLine = queryRunner.manager.create(SaleLine, {
          variant_id: orderLine.variant_id,
          quantity: orderLine.quantity,
          unit_price: orderLine.unit_price,
          discount: orderLine.discount,
          tax_rate: orderLine.tax_rate,
        });
        saleLines.push(saleLine);

        // Deduct reserved stock and reduce quantity_on_hand
        const stock = await queryRunner.manager.findOne(Stock, {
          where: {
            location_id: order.location_id,
            variant_id: orderLine.variant_id,
          },
        });

        if (stock) {
          stock.quantity_reserved -= orderLine.quantity;
          stock.quantity_on_hand -= orderLine.quantity;
          await queryRunner.manager.save(Stock, stock);
        }
      }

      // Create sale
      const sale = queryRunner.manager.create(Sale, {
        invoice_number: invoiceNumber,
        sale_date: order.order_date,
        location_id: order.location_id,
        customer_id: order.customer_id,
        subtotal_amount: order.subtotal_amount,
        discount_amount: order.discount_amount,
        tax_amount: order.tax_amount,
        total_amount: order.total_amount,
        payment_status: 'paid',
        created_by: 1, // System user
        lines: saleLines,
      });

      const savedSale = await queryRunner.manager.save(Sale, sale);

      // Update order
      order.status = 'processing';
      order.payment_status = 'paid';
      order.sale_id = savedSale.sale_id;
      await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();

      return {
        order: await this.findOne(orderId),
        sale: savedSale,
        message: 'Payment processed and order converted to sale',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return this.orderRepository.find({
      relations: [
        'location',
        'customer',
        'creator',
        'lines',
        'lines.variant',
        'lines.variant.product',
        'lines.variant.color',
        'lines.variant.size',
        'sale',
      ],
      order: { order_date: 'DESC', created_at: 'DESC' },
    });
  }

  async findOne(id: number) {
    const order = await this.orderRepository.findOne({
      where: { order_id: id },
      relations: [
        'location',
        'customer',
        'creator',
        'lines',
        'lines.variant',
        'lines.variant.product',
        'lines.variant.color',
        'lines.variant.size',
        'sale',
      ],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findByCustomer(customerId: number) {
    return this.orderRepository.find({
      where: { customer_id: customerId },
      relations: ['location', 'lines', 'lines.variant', 'sale'],
      order: { order_date: 'DESC' },
    });
  }

  async cancelOrder(orderId: number) {
    const order = await this.findOne(orderId);

    if (order.status === 'cancelled') {
      throw new BadRequestException('Order is already cancelled');
    }

    if (order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered') {
      throw new BadRequestException('Cannot cancel order in current status');
    }

    // Use transaction to release reserved stock
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Release reserved stock
      if (order.status === 'confirmed') {
        for (const line of order.lines) {
          const stock = await queryRunner.manager.findOne(Stock, {
            where: {
              location_id: order.location_id,
              variant_id: line.variant_id,
            },
          });

          if (stock) {
            stock.quantity_reserved -= line.quantity;
            await queryRunner.manager.save(Stock, stock);
          }
        }
      }

      // Update order status
      order.status = 'cancelled';
      await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();

      return this.findOne(orderId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.created_at >= :startOfDay', { startOfDay })
      .andWhere('order.created_at <= :endOfDay', { endOfDay })
      .getCount();

    const sequence = String(count + 1).padStart(4, '0');
    return `ORD-${year}${month}-${sequence}`;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

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

