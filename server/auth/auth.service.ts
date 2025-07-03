import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { storage } from '../storage';
import { RegisterData, LoginData, User } from '../../shared/schema';

export interface JwtPayload {
  sub: number;
  email: string;
  username: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async register(registerData: RegisterData): Promise<AuthTokens> {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(registerData.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const existingUsername = await storage.getUserByUsername(registerData.username);
    if (existingUsername) {
      throw new ConflictException('Username is already taken');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(registerData.password, saltRounds);

    // Create user
    const newUser = await storage.createUser({
      username: registerData.username,
      email: registerData.email,
      passwordHash,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      role: 'user',
    });

    // Generate tokens
    return this.generateTokens(newUser);
  }

  async login(loginData: LoginData): Promise<AuthTokens> {
    const user = await this.validateUser(loginData.email, loginData.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await storage.updateUserLastLogin(user.id);

    return this.generateTokens(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await storage.getUserByEmail(email);
    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const tokenRecord = await storage.getRefreshToken(refreshToken);
    if (!tokenRecord || tokenRecord.isRevoked || new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await storage.getUser(tokenRecord.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Revoke old refresh token
    await storage.revokeRefreshToken(refreshToken);

    // Generate new tokens
    return this.generateTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await storage.revokeRefreshToken(refreshToken);
  }

  async revokeAllTokens(userId: number): Promise<void> {
    await storage.revokeAllUserTokens(userId);
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = nanoid(64);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await storage.createRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        role: user.role,
      },
    };
  }

  async getUserFromToken(token: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify(token) as JwtPayload;
      const user = await storage.getUser(payload.sub);
      return user && user.isActive ? user : null;
    } catch {
      return null;
    }
  }
}