import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  TrashConfigService,
  UpdateTrashConfigDto,
} from './trash-config.service';
import { TrashPurgeScheduler } from './trash-purge.scheduler';

@ApiTags('Trash Config')
@Controller('trash-config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TrashConfigController {
  constructor(
    private readonly configService: TrashConfigService,
    private readonly purgeScheduler: TrashPurgeScheduler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all trash retention configs' })
  findAll() {
    return this.configService.findAll();
  }

  @Patch(':moduleKey')
  @Permissions('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Update retention config for a module' })
  update(
    @Param('moduleKey') moduleKey: string,
    @Body() dto: UpdateTrashConfigDto,
    @Req() req: any,
  ) {
    return this.configService.update(moduleKey, dto, req.user?.id);
  }

  @Post('run-now')
  @Permissions('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Manually trigger the trash purge job' })
  @ApiQuery({ name: 'dryRun', required: false, type: Boolean })
  async runNow(@Query('dryRun') dryRun?: string) {
    const isDryRun = dryRun === 'true';
    return this.purgeScheduler.purgeExpiredTrash(isDryRun);
  }
}
