import { Controller, Get, Post, Body, UseGuards, Patch, Param } from '@nestjs/common';
import { PlatformUsersService } from './platform-users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('platform-users')
@UseGuards(JwtAuthGuard)
export class PlatformUsersController {
  constructor(private readonly service: PlatformUsersService) {}

  @Post()
  create(@Body() body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'PLATFORM_ADMIN' | 'PLATFORM_OWNER';
  }) {
    return this.service.create(body);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }) {
    return this.service.updateStatus(id, body.status);
  }
}
