import {
  Controller, Post, Get, Put, Delete, Body, HttpCode, HttpStatus,
  UseGuards, Request, Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Public } from '../common/public.decorator';
import { UserRole, Permission } from '../users/users.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: { email: string; newPassword: string }) {
    return this.authService.resetPassword(body.email, body.newPassword);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async me(@Request() req: any) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _h, ...safe } = user;
    return safe;
  }

  // ── Super Admin only ──────────────────────────────────────────────────────

  @Post('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createAdmin(@Request() req: any, @Body() dto: CreateAdminDto) {
    return this.authService.createAdmin(
      req.user.sub, dto.name, dto.email, dto.password, dto.permissions,
    );
  }

  @Get('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  listAdmins() {
    return this.usersService.listAdmins();
  }

  @Post('admins/:id/permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  grantPermissions(@Request() req: any, @Param('id') id: string, @Body() body: { permissions: Permission[] }) {
    return this.authService.grantPermissions(req.user.sub, id, body.permissions);
  }

  @Put('admins/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async updateAdmin(@Param('id') id: string, @Body() body: { name?: string; email?: string; permissions?: Permission[] }) {
    if (body.permissions) await this.usersService.updatePermissions(id, body.permissions);
    return this.usersService.updateAdmin(id, { name: body.name, email: body.email });
  }

  @Delete('admins/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async removeAdmin(@Param('id') id: string) {
    await this.usersService.deleteAdmin(id);
    return { ok: true };
  }
}
