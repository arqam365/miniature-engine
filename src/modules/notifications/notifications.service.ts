import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantContext } from '../tenancy/tenant-context';
import { NotificationType, NotificationStatus } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(payload: {
    type: NotificationType;
    recipient: string;
    subject?: string;
    body: string;
    templateId?: string;
  }) {
    const { organizationId } = requireTenantContext();

    const notification = await this.prisma.notification.create({
      data: {
        organizationId,
        type: payload.type,
        recipient: payload.recipient,
        subject: payload.subject,
        body: payload.body,
        templateId: payload.templateId,
        status: NotificationStatus.PENDING,
      },
    });

    // Queue for async delivery — actual sending happens in BullMQ worker
    this.logger.log(`Notification queued: ${notification.id} → ${payload.recipient}`);
    return notification;
  }

  async sendBulk(recipients: string[], type: NotificationType, subject: string, body: string) {
    const { organizationId } = requireTenantContext();

    const data = recipients.map((recipient) => ({
      organizationId,
      type,
      recipient,
      subject,
      body,
      status: NotificationStatus.PENDING,
    }));

    const result = await this.prisma.notification.createMany({ data });
    return { queued: result.count };
  }

  async getHistory(page = 1, limit = 20) {
    const { organizationId } = requireTenantContext();
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { organizationId } }),
    ]);

    return { data, total, page, limit };
  }

  async getTemplates() {
    const { organizationId } = requireTenantContext();
    return this.prisma.notificationTemplate.findMany({
      where: { organizationId, isActive: true },
    });
  }

  async createTemplate(dto: {
    name: string;
    type: NotificationType;
    subject?: string;
    body: string;
    variables?: string[];
  }) {
    const { organizationId } = requireTenantContext();
    return this.prisma.notificationTemplate.create({
      data: { ...dto, organizationId },
    });
  }
}
