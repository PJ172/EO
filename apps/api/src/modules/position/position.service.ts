import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePositionDto, UpdatePositionDto, AssignEmployeeDto } from './dto/position.dto';

@Injectable()
export class PositionService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { departmentId?: string; sectionId?: string; isActive?: boolean }) {
    return this.prisma.position.findMany({
      where: {
        ...(params?.departmentId && { departmentId: params.departmentId }),
        ...(params?.sectionId && { sectionId: params.sectionId }),
        ...(params?.isActive !== undefined && { isActive: params.isActive }),
      },
      include: {
        department: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, code: true } },
        currentHolders: {
          where: { deletedAt: null },
          select: { id: true, fullName: true, avatar: true, employeeCode: true },
        },
        _count: { select: { assignments: { where: { endDate: null } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true, isActive: true } },
        currentHolders: {
          where: { deletedAt: null },
          select: { id: true, fullName: true, avatar: true, employeeCode: true, jobTitle: { select: { name: true } } },
        },
        assignments: {
          include: {
            employee: { select: { id: true, fullName: true, avatar: true, employeeCode: true } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });
    if (!position) throw new NotFoundException('Không tìm thấy vị trí này.');
    return position;
  }

  async create(dto: CreatePositionDto) {
    return this.prisma.position.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        departmentId: dto.departmentId || null,
        sectionId: dto.sectionId || null,
        parentPositionId: dto.parentPositionId || null,
      },
    });
  }

  async update(id: string, dto: UpdatePositionDto) {
    await this.findOne(id);
    return this.prisma.position.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        departmentId: dto.departmentId === '' ? null : dto.departmentId,
        sectionId: dto.sectionId === '' ? null : dto.sectionId,
        parentPositionId: dto.parentPositionId === '' ? null : dto.parentPositionId,
        isActive: dto.isActive,
        uiPositionX: dto.uiPositionX,
        uiPositionY: dto.uiPositionY,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    // Unlink all current holders before delete
    await this.prisma.employee.updateMany({
      where: { positionId: id },
      data: { positionId: null },
    });
    return this.prisma.position.delete({ where: { id } });
  }

  async getHolders(positionId: string) {
    await this.findOne(positionId);
    return this.prisma.employeePosition.findMany({
      where: { positionId, endDate: null },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
            employeeCode: true,
            jobTitle: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async assignEmployee(positionId: string, dto: AssignEmployeeDto) {
    await this.findOne(positionId);
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên.');

    // Check if already assigned and active
    const existing = await this.prisma.employeePosition.findFirst({
      where: { positionId, employeeId: dto.employeeId, endDate: null },
    });
    if (existing) throw new BadRequestException('Nhân viên đã đang giữ vị trí này.');

    // Create assignment record
    const assignment = await this.prisma.employeePosition.create({
      data: {
        positionId,
        employeeId: dto.employeeId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isPrimary: dto.isPrimary ?? true,
        note: dto.note,
      },
    });

    // Update employee's current positionId if isPrimary
    if (dto.isPrimary !== false) {
      await this.prisma.employee.update({
        where: { id: dto.employeeId },
        data: { positionId },
      });
    }

    return assignment;
  }

  async unassignEmployee(positionId: string, employeeId: string) {
    const assignment = await this.prisma.employeePosition.findFirst({
      where: { positionId, employeeId, endDate: null },
    });
    if (!assignment) throw new NotFoundException('Không tìm thấy phân công này.');

    // Close assignment
    await this.prisma.employeePosition.update({
      where: { id: assignment.id },
      data: { endDate: new Date() },
    });

    // Clear positionId on employee if this was their primary position
    await this.prisma.employee.updateMany({
      where: { id: employeeId, positionId },
      data: { positionId: null },
    });

    return { success: true };
  }

  /** Build Position hierarchy tree for Org Chart */
  async getTree(departmentId?: string) {
    const positions = await this.prisma.position.findMany({
      where: {
        isActive: true,
        ...(departmentId && { departmentId }),
      },
      include: {
        currentHolders: {
          where: { deletedAt: null },
          select: { id: true, fullName: true, avatar: true, employeeCode: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const nodes = positions.map((pos) => ({
      id: `position-${pos.id}`,
      type: 'positionNode',
      data: {
        id: pos.id,
        name: pos.name,
        code: pos.code,
        holders: pos.currentHolders,
        holderCount: pos.currentHolders.length,
        uiPositionX: pos.uiPositionX,
        uiPositionY: pos.uiPositionY,
      },
      position:
        pos.uiPositionX !== null && pos.uiPositionY !== null
          ? { x: pos.uiPositionX, y: pos.uiPositionY }
          : { x: 0, y: 0 },
    }));

    const edges = positions
      .filter((pos) => pos.parentPositionId)
      .map((pos) => ({
        id: `e-pos-${pos.parentPositionId}-${pos.id}`,
        source: `position-${pos.parentPositionId}`,
        target: `position-${pos.id}`,
        type: 'smoothstep',
        sourceHandle: 'bottom',
        targetHandle: 'top',
      }));

    return { nodes, edges };
  }

  async savePositionUiPosition(positionId: string, x: number, y: number) {
    return this.prisma.position.update({
      where: { id: positionId },
      data: { uiPositionX: x, uiPositionY: y },
    });
  }
}
