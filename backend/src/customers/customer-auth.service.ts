import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { Customer } from 'src/entities/customer.entity';

@Injectable()
export class CustomerAuthService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: CustomerRegisterDto) {
    // Check if email already exists
    const existingCustomer = await this.customerRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingCustomer) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(registerDto.password, salt);

    // Create customer
    const customer = this.customerRepository.create({
      name: registerDto.name,
      email: registerDto.email,
      password_hash,
      phone: registerDto.phone,
      address: registerDto.address,
      city: registerDto.city,
      state: registerDto.state,
      pincode: registerDto.pincode,
      country: registerDto.country,
      status: 'active',
    });

    const savedCustomer = await this.customerRepository.save(customer);

    // Generate JWT token
    const payload = {
      sub: savedCustomer.customer_id,
      email: savedCustomer.email,
      type: 'customer',
    };

    const access_token = this.jwtService.sign(payload);

    // Remove password from response
    const { password_hash: _, ...customerWithoutPassword } = savedCustomer;

    return {
      access_token,
      customer: customerWithoutPassword,
      message: 'Customer registered successfully',
    };
  }

  async login(loginDto: CustomerLoginDto) {
    // Find customer by email
    const customer = await this.customerRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!customer) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if customer has password (registered customer)
    if (!customer.password_hash) {
      throw new UnauthorizedException(
        'This customer account is not registered. Please register first.',
      );
    }

    // Check if customer is active
    if (customer.status !== 'active') {
      throw new UnauthorizedException('Customer account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      customer.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT token
    const payload = {
      sub: customer.customer_id,
      email: customer.email,
      type: 'customer',
    };

    const access_token = this.jwtService.sign(payload);

    // Remove password from response
    const { password_hash: _, ...customerWithoutPassword } = customer;

    return {
      access_token,
      customer: customerWithoutPassword,
      message: 'Login successful',
    };
  }

  async validateCustomerById(customerId: number) {
    const customer = await this.customerRepository.findOne({
      where: { customer_id: customerId },
    });

    if (!customer || customer.status !== 'active') {
      return null;
    }

    const { password_hash: _, ...customerWithoutPassword } = customer;
    return customerWithoutPassword;
  }
}

