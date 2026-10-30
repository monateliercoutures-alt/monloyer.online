import type { Role } from '@prisma/client';
import { STAFF_ROLES } from '@/lib/constants';

export type Permission =
  | 'org:manage'
  | 'team:manage'
  | 'owners:read'
  | 'owners:write'
  | 'properties:read'
  | 'properties:write'
  | 'tenants:read'
  | 'tenants:write'
  | 'leases:read'
  | 'leases:write'
  | 'payments:read'
  | 'payments:write'
  | 'payments:cancel'
  | 'receipts:read'
  | 'reminders:manage'
  | 'expenses:read'
  | 'expenses:write'
  | 'reports:read'
  | 'activity:read'
  | 'portal:tenant'
  | 'portal:owner';

const MATRIX: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'org:manage', 'team:manage', 'owners:read', 'owners:write', 'properties:read', 'properties:write',
    'tenants:read', 'tenants:write', 'leases:read', 'leases:write', 'payments:read', 'payments:write',
    'payments:cancel', 'receipts:read', 'reminders:manage', 'expenses:read', 'expenses:write',
    'reports:read', 'activity:read',
  ],
  ADMIN_AGENCE: [
    'org:manage', 'team:manage', 'owners:read', 'owners:write', 'properties:read', 'properties:write',
    'tenants:read', 'tenants:write', 'leases:read', 'leases:write', 'payments:read', 'payments:write',
    'payments:cancel', 'receipts:read', 'reminders:manage', 'expenses:read', 'expenses:write',
    'reports:read', 'activity:read',
  ],
  AGENT: [
    'owners:read', 'owners:write', 'properties:read', 'properties:write', 'tenants:read', 'tenants:write',
    'leases:read', 'leases:write', 'payments:read', 'payments:write', 'receipts:read',
    'reminders:manage', 'expenses:read', 'expenses:write', 'reports:read',
  ],
  COMPTABLE: [
    'owners:read', 'properties:read', 'tenants:read', 'leases:read', 'payments:read', 'payments:write',
    'payments:cancel', 'receipts:read', 'reminders:manage', 'expenses:read', 'expenses:write',
    'reports:read', 'activity:read',
  ],
  PROPRIETAIRE: ['portal:owner', 'properties:read', 'reports:read', 'receipts:read'],
  LOCATAIRE: ['portal:tenant', 'receipts:read'],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function isStaff(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

export class ForbiddenError extends Error {
  constructor(message = "Vous n'avez pas les droits requis pour cette action.") {
    super(message);
    this.name = 'ForbiddenError';
  }
}
