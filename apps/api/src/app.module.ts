import {
  Module,
  MiddlewareConsumer,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core'; // Import APP_INTERCEPTOR
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Core Modules
import { PrismaModule } from './modules/prisma';
import { CacheModule } from './modules/cache';
import { LoggerModule } from './common/logger';
import { HealthModule } from './health/health.module';

// Auth
import { AuthModule } from './modules/auth';

// Feature Modules
import { EmployeeModule } from './modules/employee';
import { FactoryModule } from './modules/factory/factory.module';
import { CompanyModule } from './modules/company/company.module';
import { DivisionModule } from './modules/division/division.module';
import { SectionModule } from './modules/section/section.module';
import { LeaveModule } from './modules/leave';
import { TimekeepingModule } from './modules/timekeeping';
import { NotificationsModule } from './modules/notifications';
import { AuditModule } from './modules/audit/audit.module'; // Import AuditModule
import { OrganizationModule } from './modules/organization/organization.module';
import { JobTitleModule } from './modules/job-title/job-title.module';
import { FilesModule } from './modules/files/files.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { BookingModule } from './modules/booking/booking.module'; // Import BookingModule
import { RequestsModule } from './modules/requests/requests.module';
import { KPIModule } from './modules/kpi/kpi.module';
import { CarBookingModule } from './modules/car-booking/car-booking.module';
import { NewsModule } from './modules/news/news.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportModule } from './modules/report/report.module';
import { MealModule } from './modules/meal/meal.module';
import { ITAssetModule } from './modules/it-asset/it-asset.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { SharedModule } from './shared/shared.module';
import { ColumnConfigModule } from './modules/column-config/column-config.module';
import { TrashModule } from './modules/trash/trash.module';
import { TrashCleanupCron } from './shared/trash-cleanup.cron';
import { ImportHistoryModule } from './modules/import-history/import-history.module';
import { UIConfigModule } from './modules/ui-config/ui-config.module';
import { AIModule } from './modules/ai/ai.module';
import { PositionModule } from './modules/position/position.module';

// Middleware
import { HttpLoggerMiddleware } from './common/middleware';
import { AuditInterceptor } from './common/interceptors/audit.interceptor'; // Import Interceptor

import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Global Modules
    LoggerModule,
    PrismaModule,
    CacheModule,

    // Health
    HealthModule,

    // Auth
    AuthModule,
    AuditModule, // Register AuditModule

    // Feature Modules
    EmployeeModule,
    FactoryModule,
    CompanyModule,
    DivisionModule,
    SectionModule,
    LeaveModule,
    TimekeepingModule,
    NotificationsModule,
    OrganizationModule,
    JobTitleModule,
    FilesModule,
    DocumentsModule,
    BookingModule,
    RequestsModule,
    KPIModule,
    CarBookingModule,
    NewsModule,
    TasksModule,
    UsersModule,
    RolesModule,
    ProjectsModule,
    DashboardModule,
    ReportModule,
    MealModule,
    ITAssetModule,
    TicketModule,
    WorkflowModule,
    SharedModule,
    ColumnConfigModule,
    TrashModule,
    ImportHistoryModule,
    UIConfigModule,
    AIModule,
    PositionModule,

    // Serve Static Files (Uploads)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 50 },
      { name: 'medium', ttl: 60000, limit: 500 },
      { name: 'long', ttl: 3600000, limit: 2000 },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
        exceptionFactory: (errors) => {
          const { BadRequestException } = require('@nestjs/common');

          const translateMessage = (msg: string) => {
            if (msg.includes('should not be empty'))
              return 'không được để trống';
            if (msg.includes('must be a string')) return 'phải là chuỗi ký tự';
            if (msg.includes('must be an integer')) return 'phải là số nguyên';
            if (msg.includes('should not exist'))
              return 'không được phép tồn tại';
            return msg;
          };

          const messages = errors.map((error) => {
            const constraints = error.constraints
              ? Object.values(error.constraints)
              : [];
            const property = error.property;
            // Simple translation strategy
            return constraints
              .map((c) => {
                if (c.includes('should not exist'))
                  return `Trường '${property}' không được phép tồn tại`;
                if (c.includes('should not be empty'))
                  return `Trường '${property}' không được để trống`;
                return c; // Keep others or extend translation
              })
              .join(', ');
          });
          return new BadRequestException(messages);
        },
      }),
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    TrashCleanupCron,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
