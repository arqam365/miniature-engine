import { PrismaClient, OrgType, InstituteType } from '@prisma/client';
import * as argon2 from 'argon2';
import { getAuth } from '../src/lib/auth';

const prisma = new PrismaClient();

const PERMISSIONS = [
  // Students
  { module: 'students', action: 'create' }, { module: 'students', action: 'read' },
  { module: 'students', action: 'update' }, { module: 'students', action: 'delete' },
  // Attendance
  { module: 'attendance', action: 'create' }, { module: 'attendance', action: 'read' },
  { module: 'attendance', action: 'update' },
  // Fees
  { module: 'fees', action: 'create' }, { module: 'fees', action: 'read' },
  { module: 'fees', action: 'update' }, { module: 'fees', action: 'delete' },
  // Exams
  { module: 'exams', action: 'create' }, { module: 'exams', action: 'read' },
  { module: 'exams', action: 'update' }, { module: 'exams', action: 'delete' },
  // Accounts
  { module: 'accounts', action: 'create' }, { module: 'accounts', action: 'read' },
  { module: 'accounts', action: 'update' },
  // Reports
  { module: 'reports', action: 'read' }, { module: 'reports', action: 'export' },
  // Settings
  { module: 'settings', action: 'read' }, { module: 'settings', action: 'update' },
  // Madrasa
  { module: 'madrasa', action: 'create' }, { module: 'madrasa', action: 'read' },
  { module: 'madrasa', action: 'update' },
  // Notifications
  { module: 'notifications', action: 'create' }, { module: 'notifications', action: 'read' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Seed all permissions
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { module_action: { module: p.module, action: p.action } },
      update: {},
      create: p,
    });
  }
  console.log(`✅ ${PERMISSIONS.length} permissions seeded`);

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'al-noor-trust' },
    update: {},
    create: {
      name: 'Al Noor Educational Trust',
      type: OrgType.HYBRID,
      slug: 'al-noor-trust',
    },
  });

  // Create org settings
  await prisma.orgSettings.upsert({
    where: { organizationId: org.id },
    update: {},
    create: { organizationId: org.id, timezone: 'Asia/Karachi', currency: 'PKR', language: 'en' },
  });

  // Create institutes
  const school = await prisma.institute.upsert({
    where: { id: `school-${org.id}` },
    update: {},
    create: { id: `school-${org.id}`, name: 'Al Noor School', type: InstituteType.SCHOOL, organizationId: org.id },
  });

  const madrasa = await prisma.institute.upsert({
    where: { id: `madrasa-${org.id}` },
    update: {},
    create: { id: `madrasa-${org.id}`, name: 'Al Noor Madrasa', type: InstituteType.MADRASA, organizationId: org.id },
  });

  // Create admin role with all permissions
  const allPermissions = await prisma.permission.findMany();
  const adminRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Admin' } },
    update: {},
    create: {
      name: 'Admin',
      description: 'Full access',
      organizationId: org.id,
      isSystem: true,
      rolePermissions: {
        createMany: {
          data: allPermissions.map((p) => ({ permissionId: p.id })),
          skipDuplicates: true,
        },
      },
    },
  });

  // Create principal role
  const principalPerms = allPermissions.filter((p) =>
    ['students', 'attendance', 'exams', 'fees', 'reports'].includes(p.module),
  );
  await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Principal' } },
    update: {},
    create: {
      name: 'Principal',
      organizationId: org.id,
      isSystem: true,
      rolePermissions: {
        createMany: {
          data: principalPerms.map((p) => ({ permissionId: p.id })),
          skipDuplicates: true,
        },
      },
    },
  });

  // Create teacher role
  const teacherPerms = allPermissions.filter((p) =>
    (p.module === 'attendance' && p.action !== 'delete') ||
    (p.module === 'exams' && ['read', 'update'].includes(p.action)) ||
    (p.module === 'students' && p.action === 'read'),
  );
  await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Teacher' } },
    update: {},
    create: {
      name: 'Teacher',
      organizationId: org.id,
      isSystem: true,
      rolePermissions: {
        createMany: {
          data: teacherPerms.map((p) => ({ permissionId: p.id })),
          skipDuplicates: true,
        },
      },
    },
  });

  // Create admin user via Better Auth
  const auth = await getAuth();
  const adminEmail = process.env.PLATFORM_OWNER_EMAIL ?? 'admin@cognivia.com';
  const adminPassword = process.env.PLATFORM_OWNER_PASSWORD ?? 'Admin@1234';
  const adminSignUp = await auth.api.signUpEmail({
    body: { email: adminEmail, password: adminPassword, name: 'Super Admin' },
  }).catch(() => null);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { firstName: 'Super', lastName: 'Admin', organizationId: org.id, emailVerified: true },
    create: {
      email: adminEmail,
      firstName: 'Super',
      lastName: 'Admin',
      organizationId: org.id,
      emailVerified: true,
    },
  });
  void adminSignUp;

  await prisma.userRole.upsert({
    where: { userId_roleId_instituteId: { userId: adminUser.id, roleId: adminRole.id, instituteId: school.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id, instituteId: school.id },
  });

  // Create academic year
  const ay = await prisma.academicYear.upsert({
    where: { id: `ay-2025-${org.id}` },
    update: {},
    create: {
      id: `ay-2025-${org.id}`,
      name: '2024-2025',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2025-03-31'),
      organizationId: org.id,
      isActive: true,
    },
  });

  // ── Revzion platform org + super admin ────────────────────────────────
  const platformOrg = await prisma.organization.upsert({
    where: { slug: 'revzion' },
    update: {},
    create: {
      name: 'Revzion Platform',
      type: OrgType.HYBRID,
      slug: 'revzion',
      email: 'connect@revzion.in',
      website: 'https://revzion.in',
      isActive: true,
    },
  });

  await prisma.orgSettings.upsert({
    where: { organizationId: platformOrg.id },
    update: {},
    create: { organizationId: platformOrg.id },
  });

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'connect@revzion.in';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'Revzion@2025!';

  await auth.api.signUpEmail({
    body: { email: superAdminEmail, password: superAdminPassword, name: 'Revzion Admin' },
  }).catch(() => null);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: { isSuperAdmin: true },
    create: {
      email: superAdminEmail,
      firstName: 'Revzion',
      lastName: 'Admin',
      organizationId: platformOrg.id,
      isSuperAdmin: true,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log(`✅ Revzion platform org: ${platformOrg.id}`);
  console.log(`✅ Super admin: ${superAdmin.email} / ${superAdminPassword}`);
  // ──────────────────────────────────────────────────────────────────────

  console.log(`✅ Organization: ${org.name}`);
  console.log(`✅ Institutes: ${school.name}, ${madrasa.name}`);
  console.log(`✅ Admin user: ${adminUser.email} / ${process.env.PLATFORM_OWNER_PASSWORD ?? 'Admin@1234'}`);
  console.log(`✅ Active academic year: ${ay.name}`);
  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
