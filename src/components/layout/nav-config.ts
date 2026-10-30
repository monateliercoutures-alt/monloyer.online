import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  HandCoins,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Users,
  Wallet,
  MessageCircle,
  Home,
  ScrollText,
} from 'lucide-react';
import type { Permission } from '@/lib/permissions';
import type { Role } from '@prisma/client';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
  /** Masqué dans la barre mobile basse */
  mobile?: boolean;
  badge?: 'overdue';
};

export type NavGroup = { title: string; items: NavItem[] };

export const STAFF_NAV: NavGroup[] = [
  {
    title: 'Pilotage',
    items: [
      { href: '/tableau-de-bord', label: 'Tableau de bord', icon: LayoutDashboard, mobile: true },
      { href: '/releves', label: 'Relevés de gérance', icon: BarChart3, permission: 'reports:read' },
    ],
  },
  {
    title: 'Patrimoine',
    items: [
      { href: '/proprietaires', label: 'Propriétaires', icon: Users, permission: 'owners:read' },
      { href: '/biens', label: 'Biens & logements', icon: Building2, permission: 'properties:read', mobile: true },
      { href: '/locataires', label: 'Locataires', icon: ClipboardList, permission: 'tenants:read' },
      { href: '/contrats', label: 'Contrats de bail', icon: FileText, permission: 'leases:read' },
    ],
  },
  {
    title: 'Finances',
    items: [
      { href: '/loyers', label: 'Échéancier des loyers', icon: Wallet, permission: 'payments:read', mobile: true, badge: 'overdue' },
      { href: '/paiements', label: 'Paiements', icon: HandCoins, permission: 'payments:read', mobile: true },
      { href: '/quittances', label: 'Quittances', icon: ReceiptText, permission: 'receipts:read' },
      { href: '/relances', label: 'Relances', icon: MessageCircle, permission: 'reminders:manage' },
      { href: '/depenses', label: 'Dépenses', icon: ScrollText, permission: 'expenses:read' },
    ],
  },
  {
    title: 'Organisation',
    items: [
      { href: '/journal', label: "Journal d'activité", icon: ScrollText, permission: 'activity:read' },
      { href: '/parametres', label: 'Paramètres', icon: Settings, permission: 'org:manage' },
    ],
  },
];

export const TENANT_NAV: NavGroup[] = [
  {
    title: 'Mon espace',
    items: [
      { href: '/mon-espace', label: 'Vue d’ensemble', icon: Home, mobile: true },
      { href: '/mon-espace/contrat', label: 'Mon contrat', icon: FileText, mobile: true },
      { href: '/mon-espace/quittances', label: 'Mes quittances', icon: ReceiptText, mobile: true },
    ],
  },
];

export const OWNER_NAV: NavGroup[] = [
  {
    title: 'Mon espace',
    items: [
      { href: '/mon-espace', label: 'Vue d’ensemble', icon: Home, mobile: true },
      { href: '/mon-espace/biens', label: 'Mes biens', icon: Building2, mobile: true },
      { href: '/mon-espace/releves', label: 'Mes relevés', icon: BarChart3, mobile: true },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  if (role === 'LOCATAIRE') return TENANT_NAV;
  if (role === 'PROPRIETAIRE') return OWNER_NAV;
  return STAFF_NAV;
}
