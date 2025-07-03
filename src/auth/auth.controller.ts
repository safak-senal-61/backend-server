import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ 
    summary: 'Kullanıcı Kaydı',
    description: 'Yeni kullanıcı hesabı oluşturur. Email ve kullanıcı adı benzersiz olmalıdır.'
  })
  @ApiResponse({ status: 201, description: 'Kullanıcı başarıyla kaydedildi' })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  @ApiResponse({ status: 409, description: 'Email veya kullanıcı adı zaten kullanımda' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ 
    summary: 'Kullanıcı Girişi',
    description: 'Email/kullanıcı adı ve şifre ile sistem girişi'
  })
  @ApiResponse({ status: 200, description: 'Giriş başarılı' })
  @ApiResponse({ status: 401, description: 'Geçersiz kimlik bilgileri' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @ApiOperation({ 
    summary: 'Token Yenileme',
    description: 'Refresh token ile access token yeniler'
  })
  @ApiResponse({ status: 200, description: 'Token başarıyla yenilendi' })
  @ApiResponse({ status: 401, description: 'Geçersiz refresh token' })
  async refresh(@Body() refreshDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Çıkış Yapma',
    description: 'Kullanıcının aktif oturumunu sonlandırır'
  })
  @ApiResponse({ status: 200, description: 'Çıkış başarılı' })
  async logout(@Request() req, @Body() body: { refreshToken: string }) {
    return this.authService.logout(body.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Kullanıcı Profili',
    description: 'Giriş yapmış kullanıcının profil bilgilerini döndürür'
  })
  @ApiResponse({ status: 200, description: 'Profil bilgileri' })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('verify-email')
  @ApiOperation({ 
    summary: 'Email Doğrulama',
    description: 'Email doğrulama token\'ı ile hesabı aktifleştirir'
  })
  @ApiResponse({ status: 200, description: 'Email başarıyla doğrulandı' })
  @ApiResponse({ status: 400, description: 'Geçersiz veya süresi dolmuş token' })
  async verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  @Post('forgot-password')
  @ApiOperation({ 
    summary: 'Şifre Sıfırlama İsteği',
    description: 'Email adresine şifre sıfırlama linki gönderir'
  })
  @ApiResponse({ status: 200, description: 'Şifre sıfırlama emaili gönderildi' })
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @ApiOperation({ 
    summary: 'Şifre Sıfırlama',
    description: 'Sıfırlama token\'ı ile yeni şifre belirler'
  })
  @ApiResponse({ status: 200, description: 'Şifre başarıyla sıfırlandı' })
  @ApiResponse({ status: 400, description: 'Geçersiz veya süresi dolmuş token' })
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }
}