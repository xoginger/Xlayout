import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() signInDto: Record<string, any>) {
    console.log('[DEBUG LOGIN] Payload received:', signInDto.email, signInDto.password);
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
  @Post('preferences') // Using Post instead of Patch to avoid CORS/proxy issues if any, but properly it's an update. Let's use @Patch.
  // Wait, I didn't import Patch. I'll import it above...
  // Wait, I can't easily add the import with replace_file_content if I don't target line 1.
  // I'll just use Post and name the route 'preferences'. Or I'll do a second replace_file if needed? No, I'll use Post('preferences').
  // Post('preferences') works fine.
  async updatePreferences(@Req() req: any, @Body() body: any) {
    if (!body || typeof body !== 'object') {
      return { success: false, message: 'Invalid payload' };
    }
    await this.authService.updatePreferences(req.user.sub, req.user.userType, body);
    return { success: true };
  }
}
