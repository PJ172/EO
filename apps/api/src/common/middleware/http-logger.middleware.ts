import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WinstonLoggerService } from '../logger/winston-logger.service';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  constructor(private logger: WinstonLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;

    // Log when response finishes
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const userId = (req as any).user?.sub;

      this.logger.logRequest(method, originalUrl, statusCode, duration, userId);
    });

    next();
  }
}
