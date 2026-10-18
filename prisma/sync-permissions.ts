/**
 * Run this whenever new permissions are added to the codebase.
 * It upserts all permissions and grants any missing ones to every Admin role.
 *
 * Usage: npx ts-node -r tsconfig-paths/register prisma/sync-permissions.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALL_PERMISSIONS = [
  { module: 'students',      action: 'create' }, { module: 'students',      action: 'read'   },
  { module: 'students',      action: 'update' }, { module: 'students',      action: 'delete' },
  { module: 'attendance',    action: 'create' }, { module: 'attendance',    action: 'read'   },
  { module: 'attendance',    action: 'update' },
  { module: 'fees',          action: 'create' }, { module: 'fees',          action: 'read'   },
  { module: 'fees',          action: 'update' }, { module: 'fees',          action: 'delete' },
  { module: 'exams',         action: 'create' }, { module: 'exams',         action: 'read'   },
  { module: 'exams',         action: 'update' }, { module: 'exams',         action: 'delete' },
  { module: 'accounts',      action: 'create' }, { module: 'accounts',      action: 'read'   },
  { module: 'accounts',      action: 'update' },
  { module: 'reports',       action: 'read'   }, { module: 'reports',       action: 'export' },
  { module: 'settings',      action: 'read'   }, { module: 'settings',      action: 'update' },
  { module: 'employees',     action: 'create' }, { module: 'employees',     action: 'read'   },
  { module: 'employees',     action: 'update' }, { module: 'employees',     action: 'delete' },
  { module: 'madrasa',       action: 'create' }, { module: 'madrasa',       action: 'read'   },
  { module: 'madrasa',       action: 'update' },
  { module: 'notifications', action: 'create' }, { module: 'notifications', action: 'read'   },
];

async function main() {
  // 1. Upsert all permissions
  for (const p of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { module_action: { module: p.module, action: p.action } },
      update: {},
      create: p,
    });
  }
  console.log(`✅ ${ALL_PERMISSIONS.length} permissions synced`);

  // 2. Find all Admin roles across all orgs and grant them every permission
  const allPermissions = await prisma.permission.findMany();
  const adminRoles = await prisma.role.findMany({ where: { name: 'Admin' } });

  for (const role of adminRoles) {
    await prisma.rolePermission.createMany({
      data: allPermissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
  console.log(`✅ Synced permissions to ${adminRoles.length} Admin role(s)`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
