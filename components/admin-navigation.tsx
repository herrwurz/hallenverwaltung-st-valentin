"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  Home,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Mail,
  Settings,
  ShieldCheck,
  Users,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminNavigationItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  groupLabel?: string;
};

const groupIconByLabel: Record<string, LucideIcon> = {
  Stammdaten: Building2,
  Buchungen: ClipboardList,
  Extras: ListChecks,
  Einstellungen: Settings,
};

const defaultIconByHref: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/bookings": ClipboardList,
  "/admin/booking-changes": ClipboardList,
  "/admin/series": CalendarDays,
  "/admin/calendar": CalendarDays,
  "/admin/billing": CreditCard,
  "/admin/reports": BarChart3,
  "/admin/notifications": Bell,
  "/admin/settings": Settings,
  "/admin/settings/mail": Mail,
  "/admin/settings/notifications": Bell,
  "/admin/settings/calendar": Settings,
  "/admin/waitlist": ListChecks,
  "/admin/buildings": Building2,
  "/admin/rooms": Warehouse,
  "/admin/organizations": Home,
  "/admin/users": Users,
  "/admin/roles": ShieldCheck,
  "/admin/documents": FileText,
  "/admin/access": KeyRound,
  "/admin/damages": ListChecks,
  "/admin/handovers": KeyRound,
  "/admin/holidays": CalendarDays,
  "/admin/system/jobs": Settings,
  "/admin/no-shows": ListChecks,
};

export const adminNavigation: AdminNavigationItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/calendar", label: "Kalender", icon: CalendarDays },
  { href: "/admin/bookings", label: "Buchungsanträge", icon: ClipboardList, groupLabel: "Buchungen" },
  { href: "/admin/waitlist", label: "Warteliste", icon: ListChecks, groupLabel: "Buchungen" },
  { href: "/admin/reports", label: "Berichte", icon: BarChart3, groupLabel: "Buchungen" },
  { href: "/admin/buildings", label: "Gebäude", icon: Building2, groupLabel: "Stammdaten" },
  { href: "/admin/rooms", label: "Räume", icon: Warehouse, groupLabel: "Stammdaten" },
  { href: "/admin/organizations", label: "Organisationen", icon: Home, groupLabel: "Stammdaten" },
  { href: "/admin/users", label: "Benutzer", icon: Users, groupLabel: "Stammdaten" },
  { href: "/admin/billing", label: "Abrechnung", icon: CreditCard, groupLabel: "Extras" },
  { href: "/admin/documents", label: "Dokumente", icon: FileText, groupLabel: "Extras" },
  { href: "/admin/access", label: "Zutritt", icon: KeyRound, groupLabel: "Extras" },
  { href: "/admin/settings", label: "Systemeinstellungen", icon: Settings, groupLabel: "Einstellungen" },
  { href: "/admin/settings/mail", label: "Mail / SMTP", icon: Mail, groupLabel: "Einstellungen" },
  { href: "/admin/settings/notifications", label: "Benachrichtigungsregeln", icon: Bell, groupLabel: "Einstellungen" },
  { href: "/admin/settings/calendar", label: "Öffentlicher Kalender", icon: Settings, groupLabel: "Einstellungen" },
  { href: "/admin/notifications", label: "Benachrichtigungs-Queue", icon: Bell, groupLabel: "Einstellungen" },
  { href: "/admin/roles", label: "Rollen/Rechte", icon: ShieldCheck, groupLabel: "Einstellungen" },
] as const;

type AdminNavigationProps = {
  items?: AdminNavigationItem[];
};

export function AdminNavigation({ items = adminNavigation }: AdminNavigationProps) {
  const pathname = usePathname();
  const plainItems = items.filter((item) => !item.groupLabel);
  const groupLabels = Array.from(new Set(items.map((item) => item.groupLabel).filter(Boolean))) as string[];
  const groupedItems = groupLabels.map((groupLabel) => ({
    groupLabel,
    items: items.filter((item) => item.groupLabel === groupLabel),
  }));

  function renderLink(item: AdminNavigationItem, compact = false) {
    const Icon = item.icon ?? defaultIconByHref[item.href] ?? LayoutDashboard;
    const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition",
          "hover:bg-accent hover:text-accent-foreground",
          compact && "ml-3 py-2 text-xs",
          active && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <nav className="mt-8 space-y-1" aria-label="Admin-Navigation">
      {plainItems.map((item) => renderLink(item))}
      {groupedItems.map((group) => {
        const hasActiveItem = group.items.some(
          (item) => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)),
        );

        return (
          <details key={group.groupLabel} className="mt-4" open={hasActiveItem || group.groupLabel === "Buchungen"}>
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              {(() => {
                const GroupIcon = groupIconByLabel[group.groupLabel] ?? Settings;
                return <GroupIcon className="h-3.5 w-3.5" aria-hidden="true" />;
              })()}
              {group.groupLabel}
            </summary>
            <div className="mt-1 space-y-1">{group.items.map((item) => renderLink(item, true))}</div>
          </details>
        );
      })}
    </nav>
  );
}
