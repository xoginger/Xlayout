/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() signInDto: Record<string, any>) {
    const user = await this.authService.validateUser(signInDto.email, signInDto.password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.user.sub, req.user.userType);
  }

  @UseGuards(JwtAuthGuard)
  @Post('preferences')
  async updatePreferences(@Req() req: any, @Body() body: any) {
    if (!body || typeof body !== 'object') {
      return { success: false, message: 'Payload inválido' };
    }
    await this.authService.updatePreferences(req.user.sub, req.user.userType, body);
    return { success: true };
  }
}
