import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from 'src/entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async create(createLocationDto: CreateLocationDto) {
    const location = this.locationRepository.create(createLocationDto);
    return this.locationRepository.save(location);
  }

  async findAll() {
    return this.locationRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number) {
    const location = await this.locationRepository.findOne({
      where: { location_id: id },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return location;
  }

  async update(id: number, updateLocationDto: UpdateLocationDto) {
    const location = await this.findOne(id);
    Object.assign(location, updateLocationDto);
    return this.locationRepository.save(location);
  }

  async remove(id: number) {
    const location = await this.findOne(id);
    await this.locationRepository.remove(location);
    return { message: 'Location deleted successfully' };
  }

  // Seed default locations
  async seedLocations() {
    const defaultLocations: Array<{
      name: string;
      type: 'store' | 'warehouse' | 'counter';
      status: 'active' | 'inactive';
    }> = [
      { name: 'Main Store', type: 'store', status: 'active' },
      { name: 'Warehouse', type: 'warehouse', status: 'active' },
      { name: 'Counter 1', type: 'counter', status: 'active' },
    ];

    for (const locData of defaultLocations) {
      const existingLocation = await this.locationRepository.findOne({
        where: { name: locData.name },
      });

      if (!existingLocation) {
        const location = this.locationRepository.create(locData);
        await this.locationRepository.save(location);
        console.log(`Location "${locData.name}" created`);
      }
    }
  }
}

