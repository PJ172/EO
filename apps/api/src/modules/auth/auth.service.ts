import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  roles: string[];
  departmentId?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    roles: string[];
    employee?: {
      id: string;
      fullName: string;
      avatar?: string;
      department?: {
        id: string;
        name: string;
      };
    };
  };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    console.log(`[AuthService] Validating user: ${username}`);
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        employee: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user) {
      console.warn(`[AuthService] User not found: ${username}`);
      throw new UnauthorizedException('User not found in database');
    }

    if (user.status !== 'ACTIVE') {
      console.warn(`[AuthService] User inactive: ${username}`);
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash || '',
    );

    if (!isPasswordValid) {
      console.warn(`[AuthService] Password mismatch for user: ${username}`);
      // console.log(`[AuthService] Hash in DB: ${user.passwordHash}`);
      throw new UnauthorizedException('Wrong password');
    }

    console.log(`[AuthService] User validated successfully: ${username}`);
    return user;
  }

  async login(username: string, password: string): Promise<TokenResponse> {
    const user = await this.validateUser(username, password);

    const roles = user.roles.map((ur) => ur.role.code);

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles,
      departmentId: user.employee?.department?.id,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles,
        employee: user.employee
          ? {
              id: user.employee.id,
              fullName: user.employee.fullName,
              avatar: user.employee.avatar || undefined,
              department: user.employee.department
                ? {
                    id: user.employee.department.id,
                    name: user.employee.department.name,
                  }
                : undefined,
            }
          : undefined,
      },
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        employee: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    const roles = user.roles.map((ur) => ur.role.code);

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles,
      departmentId: user.employee?.department?.id,
    };

    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  async logout(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
        employee: {
          include: {
            department: true,
            jobTitle: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roles = user.roles.map((ur) => ur.role.code);
    const permissions = [
      ...new Set([
        ...user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.code),
        ),
        ...user.permissions.map((up) => up.permission.code),
      ]),
    ];

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      roles,
      permissions,
      employee: user.employee
        ? {
            id: user.employee.id,
            fullName: user.employee.fullName,
            avatar: user.employee.avatar || undefined,
            department: user.employee.department
              ? {
                  id: user.employee.department.id,
                  name: user.employee.department.name,
                }
              : undefined,
            jobTitle: user.employee.jobTitle
              ? {
                  id: user.employee.jobTitle.id,
                  name: user.employee.jobTitle.name,
                }
              : undefined,
          }
        : undefined,
    };
  }

  async getPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    const permissions = [
      ...new Set([
        ...user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.code),
        ),
        ...user.permissions.map((up) => up.permission.code),
      ]),
    ];

    return permissions;
  }

  // ===================================
  // PASSWORD RECOVERY
  // ===================================

  async forgotPassword(email: string): Promise<any> {
    try {
      console.log(`[ForgotPassword] Request for email: ${email}`);

      // 1. Check if user exists by email
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: email }, { username: email }],
        },
        include: { employee: true },
      });

      console.log(`[ForgotPassword] User found: ${user ? user.id : 'NO'}`);

      if (!user) {
        console.log(`[ForgotPassword] User not found for email: ${email}`);
        throw new BadRequestException(
          'Không tìm thấy tài khoản với email đã nhập.',
        );
      }

      // 2. Generate OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits

      // 3. Save to DB
      await this.prisma.verificationCode.create({
        data: {
          code,
          target: email,
          type: 'PASSWORD_RESET',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
        },
      });

      // 4. Send Code (Mock - will be replaced with real email later)
      if (!user.email) throw new Error('User has no email');
      await this.sendEmailMock(user.email, code);

      return {
        message: 'Mã xác thực đã được gửi đến email của bạn',
        debugCode: process.env.NODE_ENV !== 'production' ? code : undefined,
      };
    } catch (error) {
      console.error('[ForgotPassword] ERROR:', error);
      throw error;
    }
  }

  async verifyOtp(target: string, code: string): Promise<boolean> {
    const record = await this.prisma.verificationCode.findFirst({
      where: {
        target,
        code,
        type: 'PASSWORD_RESET',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new UnauthorizedException(
        'Mã xác thực không đúng hoặc đã hết hạn.',
      );
    }

    return true;
  }

  async resetPassword(
    target: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    // 1. Verify again to be sure
    const isValid = await this.verifyOtp(target, code);
    if (!isValid) return;

    // 2. Find User by email
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: target }, { username: target }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Không tìm thấy người dùng.');
    }

    // 3. Update Password
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // 4. Invalidate OTP (Delete all codes for this target)
    await this.prisma.verificationCode.deleteMany({
      where: { target, type: 'PASSWORD_RESET' },
    });
  }

  private async sendEmailMock(email: string, code: string) {
    console.log(`[MOCK EMAIL] To: ${email} - OTP: ${code}`);
    // TODO: Integrate Office 365 SMTP or Nodemailer
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.passwordHash) {
      return false;
    }

    return bcrypt.compare(password, user.passwordHash);
  }
}
