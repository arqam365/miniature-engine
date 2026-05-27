import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  organizationId: string;
  instituteId?: string;
  userId: string;
  permissions: string[];
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

export function requireTenantContext(): TenantContext {
  const ctx = tenantStorage.getStore();
  if (!ctx) throw new Error('Tenant context not available');
  return ctx;
}
