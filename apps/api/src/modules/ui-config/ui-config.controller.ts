import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Query,
  ForbiddenException,
  Req,
  Param,
} from '@nestjs/common';
import { UIConfigService } from './ui-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { VisibilityTargetType } from '@prisma/client';

@ApiTags('UI Config')
@Controller('ui-config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UIConfigController {
  constructor(private readonly uiConfigService: UIConfigService) {}

  @Get('modules')
  @ApiOperation({
    summary:
      'Lấy cấu hình hiển thị module thực tế hoặc cấu hình của một đối tượng cụ thể',
  })
  async getModules(
    @CurrentUser() user: any,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
  ) {
    // Nếu có tham số target -> Chỉ admin mới được xem cấu hình tường minh của Target đó
    if (targetType) {
      if (!user.permissions?.includes('ADMIN') && user.role !== 'ADMIN') {
        throw new ForbiddenException(
          'Bạn không có quyền xem cấu hình của đối tượng khác',
        );
      }
      return this.uiConfigService.getTargetConfigs(
        targetType as any,
        targetId || null,
      );
    }

    // Mặc định trả về cấu hình thực tế cho User hiện tại
    return this.uiConfigService.getEffectiveVisibility(user.id);
  }

  @Post('modules')
  @ApiOperation({ summary: 'Cá nhân tự cấu hình hiển thị module' })
  async updateMyConfig(
    @CurrentUser() user: any,
    @Body() body: { moduleCode: string; isVisible: boolean },
  ) {
    return this.uiConfigService.setVisibilityConfig({
      moduleCode: body.moduleCode,
      targetType: 'USER',
      targetId: user.id,
      isVisible: body.isVisible,
      updatedById: user.id,
    });
  }

  @Post('admin/set-visibility')
  @Permissions('ADMIN')
  @ApiOperation({
    summary: 'Admin cấu hình hiển thị cho một đối tượng (User/Dept/Global...)',
  })
  async adminSetVisibility(
    @CurrentUser() admin: any,
    @Body()
    body: {
      moduleCode: string;
      targetType: 'USER' | 'DEPT' | 'DIV' | 'FACT' | 'COMP' | 'GLOBAL';
      targetId?: string;
      isVisible: boolean;
    },
  ) {
    return this.uiConfigService.setVisibilityConfig({
      ...body,
      updatedById: admin.id,
    });
  }

  @Get('admin/all-configs')
  @Permissions('ADMIN')
  @ApiOperation({ summary: 'Lấy tất cả cấu hình hiển thị đã lưu (Admin)' })
  async getAllSavedConfigs() {
    return this.uiConfigService.getAllSavedConfigs();
  }

  @Post('admin/bulk-visibility')
  @Permissions('ADMIN')
  @ApiOperation({
    summary: 'Thiết lập hiển thị hàng loạt cho đối tượng (Admin)',
  })
  async bulkUpdateVisibility(
    @Body()
    body: {
      targetType: VisibilityTargetType;
      targetId: string | null;
      configs: { moduleCode: string; isVisible: boolean }[];
      name?: string;
    },
    @Req() req: any,
  ) {
    return this.uiConfigService.bulkUpdateVisibility(
      body.targetType,
      body.targetId,
      body.configs,
      body.name,
      req.user.id,
    );
  }

  @Delete('admin/bulk-visibility')
  @Permissions('ADMIN')
  @ApiOperation({
    summary: 'Xóa toàn bộ cấu hình hiển thị của một đối tượng (Admin)',
  })
  async deleteBulkVisibility(
    @Query('targetType') targetType: VisibilityTargetType,
    @Query('targetId') targetId: string,
  ) {
    return this.uiConfigService.deleteTargetConfigs(targetType, targetId);
  }
}
