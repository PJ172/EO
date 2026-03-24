import { Controller, Get } from '@nestjs/common';
import { Public } from '../modules/auth/decorators/public.decorator';

interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('ready')
  @Public()
  readiness(): { ready: boolean } {
    // Add database/redis connectivity checks here
    return { ready: true };
  }

  @Get('live')
  @Public()
  liveness(): { alive: boolean } {
    return { alive: true };
  }
}
