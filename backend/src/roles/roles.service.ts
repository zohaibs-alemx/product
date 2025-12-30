import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from 'src/entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async findAll() {
    return this.roleRepository.find();
  }

  async findOne(id: number) {
    return this.roleRepository.findOne({ where: { role_id: id } });
  }

  async seedRoles() {
    const roles = [
      { name: 'admin', description: 'Full system access' },
      { name: 'manager', description: 'Manage purchases, sales, and reports' },
      { name: 'cashier', description: 'Handle sales and payments' },
      { name: 'stock_keeper', description: 'Manage stock and receiving goods' },
    ];

    for (const roleData of roles) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = this.roleRepository.create(roleData);
        await this.roleRepository.save(role);
        console.log(`Role "${roleData.name}" created`);
      }
    }
  }
}



