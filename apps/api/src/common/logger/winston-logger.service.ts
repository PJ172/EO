import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = format;

// Custom format for console output
const consoleFormat = printf(
  ({ level, message, timestamp, context, trace, ...meta }) => {
    const ctx = context ? `[${context}]` : '';
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    const traceStr = trace ? `\n${trace}` : '';
    return `${timestamp} ${level} ${ctx} ${message} ${metaStr}${traceStr}`;
  },
);

// Custom format for production (JSON)
const productionFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  json(),
);

// Custom format for development
const developmentFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  consoleFormat,
);

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private logger: Logger;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    this.logger = createLogger({
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      format: isProduction ? productionFormat : developmentFormat,
      defaultMeta: { service: 'eoffice-api' },
      transports: [
        // Console transport
        new transports.Console(),

        // File transports (production only)
        ...(isProduction
          ? [
              // Error logs
              new transports.File({
                filename: 'logs/error.log',
                level: 'error',
                format: productionFormat,
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
              }),
              // Combined logs
              new transports.File({
                filename: 'logs/combined.log',
                format: productionFormat,
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
              }),
            ]
          : []),
      ],
    });
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Custom method for structured logging
  logWithMeta(level: string, message: string, meta: Record<string, any>) {
    this.logger.log(level, message, meta);
  }

  // Log HTTP request
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string,
  ) {
    this.logger.info('HTTP Request', {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      userId,
      context: 'HTTP',
    });
  }
}
