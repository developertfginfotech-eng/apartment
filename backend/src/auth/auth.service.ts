import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService, UserRole, Permission } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto.name, dto.email, dto.password);
    const token = this.signToken(user.id, user.email, user.role);
    return { user, token };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _h, ...safe } = user;
    const token = this.signToken(user.id, user.email, user.role);
    return { user: safe, token };
  }

  async createAdmin(
    creatorId: string,
    name: string,
    email: string,
    password: string,
    permissions: Permission[],
  ) {
    const creator = await this.usersService.findById(creatorId);
    if (!creator || creator.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can create admin accounts');
    }
    const user = await this.usersService.create(
      name, email, password, UserRole.ADMIN, permissions, creatorId,
    );
    const token = this.signToken(user.id, user.email, user.role);
    return { user, token };
  }

  async grantPermissions(superAdminId: string, adminId: string, permissions: Permission[]) {
    const grantor = await this.usersService.findById(superAdminId);
    if (!grantor || grantor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can grant permissions');
    }
    return this.usersService.updatePermissions(adminId, permissions);
  }

  async resetPassword(email: string, newPassword: string): Promise<{ ok: boolean }> {
    const ok = await this.usersService.resetPasswordByEmail(email, newPassword);
    return { ok };
  }

  private signToken(id: string, email: string, role: UserRole): string {
    return this.jwtService.sign({ sub: id, email, role });
  }
}
