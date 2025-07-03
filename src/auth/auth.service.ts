import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: any) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        username: registerDto.username,
        email: registerDto.email,
        password: hashedPassword,
      },
    });

    const { password, ...result } = user;
    const tokens = await this.generateTokens(result);
    
    return {
      user: result,
      ...tokens,
    };
  }

  async login(loginDto: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !await bcrypt.compare(loginDto.password, user.password)) {
      throw new Error('Geçersiz kimlik bilgileri');
    }

    const { password, ...result } = user;
    const tokens = await this.generateTokens(result);
    
    return {
      user: result,
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    // Refresh token logic
    return { message: 'Token yenilendi' };
  }

  async logout(refreshToken: string) {
    // Logout logic
    return { message: 'Çıkış yapıldı' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        profilePictureUrl: true,
        bio: true,
        level: true,
        coins: true,
        diamonds: true,
        createdAt: true,
      },
    });

    return user;
  }

  async verifyEmail(token: string) {
    // Email verification logic
    return { message: 'E-posta doğrulandı' };
  }

  async forgotPassword(email: string) {
    // Forgot password logic
    return { message: 'Şifre sıfırlama e-postası gönderildi' };
  }

  async resetPassword(token: string, newPassword: string) {
    // Reset password logic
    return { message: 'Şifre sıfırlandı' };
  }

  private async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email, username: user.username };
    
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}