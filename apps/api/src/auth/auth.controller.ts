/**
 * Creado y diseñado por XO
 * XLayout System — Auth Controller
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpoints de autenticación incluyendo login, refresh, token exchange
 * cross-domain, logout y perfil del usuario autenticado.
 */

import {
  Controller, Post, Body, Get, UseGuards, Req,
  UnauthorizedException, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ─── Login ──────────────────────────────────────────────────────────────────────────
  // SEGURIDAD: Máximo 10 intentos de login por minuto por IP (protección brute-force)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() signInDto: Record<string, any>) {
    const user = await this.authService.validateUser(signInDto.email, signInDto.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.authService.login(user);
  }

  // ─── Perfil del usuario autenticado ─────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.user.sub, req.user.userType);
  }

  // ─── Refresh Token ──────────────────────────────────────────────────────────
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    if (!body.refresh_token) {
      throw new BadRequestException('refresh_token es requerido');
    }
    return this.authService.refreshToken(body.refresh_token);
  }

  // ─── Token Exchange (genera código de un solo uso para cross-domain) ────────
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('exchange-token')
  async exchangeToken(@Req() req: any) {
    const code = await this.authService.createExchangeCode(
      req.user.sub,
      req.user.userType,
    );
    return { exchange_code: code };
  }

  // ─── Redeem Exchange Code (canjea código por tokens) ────────────────────────
  @HttpCode(HttpStatus.OK)
  @Post('redeem-code')
  async redeemCode(@Body() body: { code: string }) {
    if (!body.code) {
      throw new BadRequestException('code es requerido');
    }
    return this.authService.redeemExchangeCode(body.code);
  }

  // ─── Logout (invalida refresh token) ────────────────────────────────────────
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Body() body: { refresh_token?: string }) {
    if (body.refresh_token) {
      await this.authService.revokeRefreshToken(body.refresh_token);
    }
    return { success: true };
  }

  // ─── Preferencias de usuario ────────────────────────────────────────────────
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
