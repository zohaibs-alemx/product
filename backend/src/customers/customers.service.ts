import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from 'src/entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const customer = this.customerRepository.create({
      ...createCustomerDto,
      status: createCustomerDto.status || 'active',
    });
    return this.customerRepository.save(customer);
  }

  async findAll() {
    return this.customerRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number) {
    const customer = await this.customerRepository.findOne({
      where: { customer_id: id },
      relations: ['sales'],
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.findOne(id);
    Object.assign(customer, updateCustomerDto);
    return this.customerRepository.save(customer);
  }

  async remove(id: number) {
    const customer = await this.findOne(id);
    await this.customerRepository.remove(customer);
    return { message: 'Customer deleted successfully' };
  }

  async search(query: string) {
    return this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.name LIKE :query', { query: `%${query}%` })
      .orWhere('customer.email LIKE :query', { query: `%${query}%` })
      .orWhere('customer.phone LIKE :query', { query: `%${query}%` })
      .getMany();
  }
}

