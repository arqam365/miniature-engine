import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { getAuth } from '../../lib/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const slugTaken = await this.prisma.organization.findUnique({
      where: { slug: dto.organizationSlug },
    });
    if (slugTaken) throw new ConflictException('Organization slug already taken');

    const org = await this.prisma.organization.create({
      data: {
        name: dto.organizationName,
        type: dto.organizationType,
        slug: dto.organizationSlug,
      },
    });

    await this.prisma.orgSettings.create({ data: { organizationId: org.id } });

    // Create user + credential account via Better Auth
    const auth = await getAuth();
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: dto.email,
        password: dto.password,
        name: `${dto.firstName} ${dto.lastName}`,
      },
    });

    const userId = (signUpResult as any)?.user?.id ?? uuidv4();

    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        id: userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        organizationId: org.id,
        emailVerified: true,
      },
    });

    return {
      message: 'Organization registered successfully',
      organizationId: org.id,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        organizationId: true,
        isSuperAdmin: true,
        lastLoginAt: true,
        organization: {
          select: { id: true, name: true, type: true, slug: true, logo: true },
        },
        userRoles: {
          include: { role: true, institute: { select: { id: true, name: true } } },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getInstitutes(userId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, instituteId: { not: null } },
      include: {
        institute: {
          select: { id: true, name: true, type: true, code: true, logo: true },
        },
      },
      distinct: ['instituteId'],
    });
    return userRoles.map((ur) => ur.institute).filter(Boolean);
  }
}
