import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TrashConfigService } from './trash-config.service';
import { subDays } from 'date-fns';

// Maps moduleKey -> Prisma model delegate name
const MODULE_PRISMA_MAP: Record<string, string> = {
  employees: 'employee',
  departments: 'department',
  users: 'user',
  jobTitles: 'jobTitle',
  factories: 'factory',
  documents: 'document',
  projects: 'project',
  tasks: 'projectTask',
  newsArticles: 'newsArticle',
  itAssets: 'iTAsset',
  tickets: 'ticket',
  roles: 'role',
  kpi: 'employeeKPI',
  files: 'file',
};

export interface PurgeResult {
  dryRun: boolean;
  purgedAt: Date;
  results: Array<{
    moduleKey: string;
    moduleName: string;
    retentionDays: number;
    purgedCount: number;
    cutoffDate: Date;
  }>;
  totalPurged: number;
  errors: string[];
}

@Injectable()
export class TrashPurgeScheduler {
  private readonly logger = new Logger(TrashPurgeScheduler.name);

  constructor(
    private prisma: PrismaService,
    private configService: TrashConfigService,
  ) {}

  // Run every day at 2:00 AM
  @Cron('0 2 * * *')
  async scheduledPurge() {
    this.logger.log('Starting scheduled trash purge...');
    const result = await this.purgeExpiredTrash(false);
    this.logger.log(
      `Trash purge completed. Total purged: ${result.totalPurged}. Errors: ${result.errors.length}`,
    );
  }

  async purgeExpiredTrash(dryRun = false): Promise<PurgeResult> {
    const configs = await this.configService.findAll();
    const results: PurgeResult['results'] = [];
    const errors: string[] = [];
    let totalPurged = 0;

    for (const config of configs) {
      if (!config.isEnabled || config.retentionDays <= 0) {
        continue;
      }

      const prismaModelKey = MODULE_PRISMA_MAP[config.moduleKey];
      if (!prismaModelKey) {
        this.logger.warn(
          `No Prisma model mapping for moduleKey: ${config.moduleKey}`,
        );
        continue;
      }

      const cutoffDate = subDays(new Date(), config.retentionDays);
      const model = (this.prisma as any)[prismaModelKey];

      if (!model) {
        errors.push(
          `Prisma model "${prismaModelKey}" not found for module "${config.moduleKey}"`,
        );
        continue;
      }

      try {
        if (dryRun) {
          // Count only, don't delete
          const count = await model.count({
            where: {
              deletedAt: { not: null, lt: cutoffDate },
            },
          });
          results.push({
            moduleKey: config.moduleKey,
            moduleName: config.moduleName,
            retentionDays: config.retentionDays,
            purgedCount: count,
            cutoffDate,
          });
          totalPurged += count;
        } else {
          // Actually delete
          const deleted = await model.deleteMany({
            where: {
              deletedAt: { not: null, lt: cutoffDate },
            },
          });
          results.push({
            moduleKey: config.moduleKey,
            moduleName: config.moduleName,
            retentionDays: config.retentionDays,
            purgedCount: deleted.count,
            cutoffDate,
          });
          totalPurged += deleted.count;

          if (deleted.count > 0) {
            this.logger.log(
              `Purged ${deleted.count} records from "${config.moduleKey}" (older than ${config.retentionDays} days)`,
            );
          }
        }
      } catch (err: any) {
        const msg = `Error purging "${config.moduleKey}": ${err?.message || err}`;
        errors.push(msg);
        this.logger.error(msg);
      }
    }

    return {
      dryRun,
      purgedAt: new Date(),
      results,
      totalPurged,
      errors,
    };
  }
}
