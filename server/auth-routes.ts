import { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { storage } from './storage';
import { registerSchema, loginSchema, type RegisterData, type LoginData } from '../shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface JwtPayload {
  sub: number;
  email: string;
  username: string;
  role: string;
}

interface AuthTokens {
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

// Auth middleware
export const authenticateToken = async (req: Request, res: Response, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await storage.getUser(payload.sub);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

async function generateTokens(user: any): Promise<AuthTokens> {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
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

export function registerAuthRoutes(app: Express): void {
  // Register endpoint
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const registerData = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(registerData.email);
      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      const existingUsername = await storage.getUserByUsername(registerData.username);
      if (existingUsername) {
        return res.status(409).json({ error: 'Username is already taken' });
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
      const tokens = await generateTokens(newUser);
      res.status(201).json(tokens);

    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({ 
        error: error.message || 'Registration failed',
        details: error.issues || undefined
      });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const loginData = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(loginData.email);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(loginData.password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Generate tokens
      const tokens = await generateTokens(user);
      res.json(tokens);

    } catch (error: any) {
      console.error('Login error:', error);
      res.status(400).json({ 
        error: error.message || 'Login failed',
        details: error.issues || undefined 
      });
    }
  });

  // Refresh token endpoint
  app.post('/api/auth/refresh', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }

      const tokenRecord = await storage.getRefreshToken(refreshToken);
      if (!tokenRecord || tokenRecord.isRevoked || new Date() > tokenRecord.expiresAt) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      const user = await storage.getUser(tokenRecord.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      // Revoke old refresh token
      await storage.revokeRefreshToken(refreshToken);

      // Generate new tokens
      const tokens = await generateTokens(user);
      res.json(tokens);

    } catch (error: any) {
      console.error('Refresh token error:', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await storage.revokeRefreshToken(refreshToken);
      }

      res.json({ message: 'Logged out successfully' });

    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Logout from all devices
  app.post('/api/auth/logout-all', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      await storage.revokeAllUserTokens(user.id);

      res.json({ message: 'Logged out from all devices' });

    } catch (error: any) {
      console.error('Logout all error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Get current user profile
  app.get('/api/auth/me', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      });

    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  });

  // Placeholder endpoints for future implementation
  app.post('/api/auth/verify-email', async (req: Request, res: Response) => {
    res.json({ message: 'Email verification functionality to be implemented' });
  });

  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    res.json({ message: 'Password reset functionality to be implemented' });
  });

  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    res.json({ message: 'Password reset functionality to be implemented' });
  });
}