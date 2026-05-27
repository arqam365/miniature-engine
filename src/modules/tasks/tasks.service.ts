import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { requireTenantContext } from '../tenancy/tenant-context';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaskDto, createdById: string) {
    const { organizationId } = requireTenantContext();
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        organizationId,
        instituteId: dto.instituteId,
        assignedToId: dto.assignedToId,
        createdById,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAll(query: { page?: number; limit?: number; completed?: boolean }) {
    const { organizationId } = requireTenantContext();
    const { page = 1, limit = 20, completed } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (completed !== undefined) where.isCompleted = completed;

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isCompleted: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findMyTasks(userId: string) {
    const { organizationId } = requireTenantContext();
    return this.prisma.task.findMany({
      where: { organizationId, assignedToId: userId, isCompleted: false },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async complete(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.assignedToId && task.assignedToId !== userId) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: { isCompleted: true, completedAt: new Date() },
    });
  }
}
