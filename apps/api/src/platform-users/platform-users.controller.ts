/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Get, Post, Body, UseGuards, Patch, Param } from '@nestjs/common';
import { PlatformUsersService } from './platform-users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTypeGuard } from '../common/guards/user-type.guard';
import { AllowedUserTypes } from '../common/decorators/user-type.decorator';

// Solo PLATFORM_USER puede gestionar usuarios de plataforma
@Controller('platform-users')
@UseGuards(JwtAuthGuard, UserTypeGuard)
@AllowedUserTypes('PLATFORM_USER')
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
