import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
  ParseIntPipe,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomerOrStaffGuard } from '../customers/guards/customer-or-staff.guard';
import { OptionalJwtGuard } from './guards/optional-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetRequestUser } from './decorators/get-request-user.decorator';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // Guest checkout - Auth is optional! Works with or without token
  @Post()
  @UseGuards(OptionalJwtGuard)
  create(
    @Body() createSaleDto: CreateSaleDto,
    @GetRequestUser() user: any,
  ) {
    // Guest checkout (no user) - customer_id can be null or provided
    if (!user) {
      // Guest sale - no customer_id required, use system user for created_by
      return this.salesService.create(createSaleDto, 1, 'guest');
    }
    
    // Authenticated user
    if (user.type === 'customer') {
      // Registered customer - auto-set customer_id
      createSaleDto.customer_id = user.customer_id;
      return this.salesService.create(createSaleDto, 1, 'customer');
    } else {
      // Staff creating sale - check roles
      if (!['admin', 'manager', 'cashier'].includes(user.role?.name)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      return this.salesService.create(createSaleDto, user.user_id, 'staff');
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.salesService.findAll();
  }

  @Get(':id')
  @UseGuards(CustomerOrStaffGuard)
  async findOne(@Param('id', ParseIntPipe) id: number, @GetRequestUser() user: any) {
    const sale = await this.salesService.findOne(id);
    // Customers can only view their own sales
    if (user.type === 'customer') {
      if (sale.customer_id !== user.customer_id) {
        throw new UnauthorizedException('Unauthorized to view this sale');
      }
    }
    return sale;
  }

  @Get('customer/:customerId')
  @UseGuards(CustomerOrStaffGuard)
  findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @GetRequestUser() user: any,
  ) {
    // Customers can only view their own sales
    if (user.type === 'customer' && user.customer_id !== customerId) {
      throw new UnauthorizedException('Unauthorized to view other customer sales');
    }
    return this.salesService.findByCustomer(customerId);
  }

  @Get('location/:locationId')
  @UseGuards(JwtAuthGuard)
  findByLocation(@Param('locationId', ParseIntPipe) locationId: number) {
    return this.salesService.findByLocation(locationId);
  }

  @Post(':id/payments')
  @UseGuards(CustomerOrStaffGuard)
  async addPayment(
    @Param('id', ParseIntPipe) saleId: number,
    @Body() createPaymentDto: CreatePaymentDto,
    @GetRequestUser() user: any,
  ) {
    // Check if customer can pay for this sale
    if (user.type === 'customer') {
      const sale = await this.salesService.findOne(saleId);
      if (sale.customer_id !== user.customer_id) {
        throw new UnauthorizedException('Unauthorized to pay for this sale');
      }
      // For customer payments, use system user ID (1) as received_by
      // received_by must be a user_id, not customer_id
      return this.salesService.addPayment(saleId, createPaymentDto, 1);
    } else {
      // Staff processing payment
      if (!['admin', 'manager', 'cashier'].includes(user.role?.name)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      return this.salesService.addPayment(saleId, createPaymentDto, user.user_id);
    }
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.remove(id);
  }
}

