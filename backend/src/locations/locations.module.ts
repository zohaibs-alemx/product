import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { Location } from 'src/entities/location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Location])],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule implements OnModuleInit {
  constructor(private readonly locationsService: LocationsService) {}

  async onModuleInit() {
    // Seed default locations on module initialization
    await this.locationsService.seedLocations();
  }
}


