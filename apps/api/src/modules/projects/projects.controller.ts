import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import {
  CreateProjectTaskDto,
  UpdateProjectTaskDto,
  CreateDependencyDto,
} from './dto/task.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard)
@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // PROJECTS
  @Post()
  @Permissions('PROJECT_CREATE')
  @ApiOperation({ summary: 'Create a new project' })
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @Permissions('PROJECT_READ')
  @ApiOperation({ summary: 'Get all projects' })
  findAll(@Query('isDeleted') isDeleted?: string) {
    return this.projectsService.findAll(isDeleted === 'true');
  }

  @Get(':id')
  @Permissions('PROJECT_READ')
  @ApiOperation({ summary: 'Get project details including tasks' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('PROJECT_UPDATE')
  @ApiOperation({ summary: 'Update project' })
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @Permissions('PROJECT_DELETE')
  @ApiOperation({ summary: 'Delete project' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.projectsService.remove(id, req.user?.id);
  }

  // TASKS
  // Note: URL structure could be /projects/:projectId/tasks or just /projects/tasks
  // I'll generic /projects/tasks for creation if projectId is in body, but hierarchical URL is RESTful.
  // Given the DTO, let's use non-hierarchical for creation simplification or use a specific route.

  @Post('tasks')
  @Permissions('TASK_CREATE')
  @ApiOperation({ summary: 'Create a task' })
  createTask(@Body() createProjectTaskDto: CreateProjectTaskDto) {
    return this.projectsService.createTask(createProjectTaskDto);
  }

  @Patch('tasks/:id')
  @Permissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Update a task' })
  updateTask(
    @Param('id') id: string,
    @Body() updateProjectTaskDto: UpdateProjectTaskDto,
  ) {
    return this.projectsService.updateTask(id, updateProjectTaskDto);
  }

  @Delete('tasks/:id')
  @Permissions('TASK_DELETE')
  @ApiOperation({ summary: 'Delete a task' })
  removeTask(@Param('id') id: string, @Req() req: any) {
    return this.projectsService.removeTask(id, req.user?.id);
  }

  // DEPENDENCIES
  @Post('dependencies')
  @Permissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Create task dependency' })
  createDependency(@Body() createDependencyDto: CreateDependencyDto) {
    return this.projectsService.createDependency(createDependencyDto);
  }

  @Delete('dependencies/:id')
  @Permissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Delete dependency' })
  removeDependency(@Param('id') id: string) {
    return this.projectsService.removeDependency(id);
  }

  @Post(':id/restore')
  @Permissions('PROJECT_DELETE')
  @ApiOperation({ summary: 'Restore a soft-deleted project' })
  restore(@Param('id') id: string) {
    return this.projectsService.restore(id);
  }

  @Delete(':id/force')
  @Permissions('PROJECT_DELETE')
  @ApiOperation({ summary: 'Permanently delete a project' })
  forceDelete(@Param('id') id: string) {
    return this.projectsService.forceDelete(id);
  }
}
