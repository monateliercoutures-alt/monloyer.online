import { Badge } from '@/components/ui/badge';
import {
  LEASE_STATUS_CLASSES,
  LEASE_STATUS_LABELS,
  PROPERTY_STATUS_CLASSES,
  PROPERTY_STATUS_LABELS,
  RENT_STATUS_CLASSES,
  RENT_STATUS_LABELS,
  UNIT_STATUS_CLASSES,
  UNIT_STATUS_LABELS,
} from '@/lib/constants';
import type { LeaseStatus, PropertyStatus, RentStatus, UnitStatus } from '@prisma/client';

export function RentStatusBadge({ status }: { status: RentStatus }) {
  return <Badge className={RENT_STATUS_CLASSES[status]}>{RENT_STATUS_LABELS[status]}</Badge>;
}

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  return <Badge className={PROPERTY_STATUS_CLASSES[status]}>{PROPERTY_STATUS_LABELS[status]}</Badge>;
}

export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  return <Badge className={UNIT_STATUS_CLASSES[status]}>{UNIT_STATUS_LABELS[status]}</Badge>;
}

export function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
  return <Badge className={LEASE_STATUS_CLASSES[status]}>{LEASE_STATUS_LABELS[status]}</Badge>;
}
