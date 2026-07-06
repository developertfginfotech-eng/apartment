import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PropertyModule } from './property/property.module';
import { PropertyTypeModule } from './property-type/property-type.module';
import { PropertyFloorModule } from './property-floor/property-floor.module';
import { PropertyUnitModule } from './property-unit/property-unit.module';
import { LandlordModule } from './landlord/landlord.module';
import { RenterModule } from './renter/renter.module';
import { LeaseModule } from './lease/lease.module';
import { LeaseUnitModule } from './lease-unit/lease-unit.module';
import { LeaseUtilityModule } from './lease-utility/lease-utility.module';
import { LeaseInterestModule } from './lease-interest/lease-interest.module';
import { PaymentModule } from './payment/payment.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { MaintenanceTypeModule } from './maintenance-type/maintenance-type.module';
import { ExpenseModule } from './expense/expense.module';
import { ExpenseTypeModule } from './expense-type/expense-type.module';
import { GeneralExpenseModule } from './general-expense/general-expense.module';
import { EmployeeModule } from './employee/employee.module';
import { PayrollModule } from './payroll/payroll.module';
import { SalaryStructureModule } from './salary-structure/salary-structure.module';
import { ManagePayrollModule } from './manage-payroll/manage-payroll.module';
import { DocumentModule } from './document/document.module';
import { UtilityModule } from './utility/utility.module';
import { NoticeBoardModule } from './notice-board/notice-board.module';
import { ParkingModule } from './parking/parking.module';
import { LoanModule } from './loan/loan.module';
import { SecurityMoneyModule } from './security-money/security-money.module';
import { SettingModule } from './setting/setting.module';
import { ReportModule } from './report/report.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { TodoModule } from './todo/todo.module';
import { MessageModule } from './message/message.module';
import { CalendarModule } from './calendar/calendar.module';
import { WtaxModule } from './wtax/wtax.module';
import { TaxModule } from './tax/tax.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true, secret: process.env.JWT_SECRET ?? 'apartment-dev-secret-2024', signOptions: { expiresIn: '7d' } }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type:        'mysql',
        host:        cfg.get('DB_HOST',     '127.0.0.1'),
        port:        cfg.get<number>('DB_PORT', 3306),
        username:    cfg.get('DB_USER',     'manage'),
        password:    cfg.get('DB_PASS',     ''),
        database:    cfg.get('DB_NAME',     'manage'),
        autoLoadEntities: true,
        synchronize: false,
        logging:     false,
        ssl:         cfg.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : undefined,
      }),
    }),
    AuthModule, UsersModule, RolesModule, PermissionsModule, DashboardModule,
    PropertyModule, PropertyTypeModule, PropertyFloorModule, PropertyUnitModule,
    LandlordModule, RenterModule, LeaseModule, LeaseUnitModule, LeaseUtilityModule,
    LeaseInterestModule, PaymentModule, MaintenanceModule, MaintenanceTypeModule,
    ExpenseModule, ExpenseTypeModule, GeneralExpenseModule, EmployeeModule,
    PayrollModule, SalaryStructureModule, ManagePayrollModule, DocumentModule,
    UtilityModule, NoticeBoardModule, ParkingModule, LoanModule, SecurityMoneyModule,
    SettingModule, ReportModule, ActivityLogModule, TodoModule, MessageModule,
    CalendarModule, WtaxModule, TaxModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Register JwtAuthGuard globally so all controllers are protected without importing JwtModule per-module
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
