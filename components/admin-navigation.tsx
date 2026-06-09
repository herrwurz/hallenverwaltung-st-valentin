"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
};

const defaultIconByHref: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/bookings": ClipboardList,
  "/admin/booking-changes": ClipboardList,
  "/admin/series": CalendarDays,
  "/admin/calendar": CalendarDays,
  "/admin/billing": CreditCard,
  "/admin/notifications": Bell,
  "/admin/settings/calendar": Settings,
  "/admin/waitlist": ListChecks,
  "/admin/buildings": Building2,
  "/admin/rooms": Warehouse,
  "/admin/organizations": Home,
  "/admin/users": Users,
  "/admin/roles": ShieldCheck,
  "/admin/documents": FileText,
  "/admin/access": KeyRound,
};

export const adminNavigation: AdminNavigationItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Buchungen", icon: ClipboardList },
  { href: "/admin/calendar", label: "Kalender", icon: CalendarDays },
  { href: "/admin/billing", label: "Abrechnung", icon: CreditCard },
  { href: "/admin/notifications", label: "Benachrichtigungen", icon: Bell },
  { href: "/admin/settings/calendar", label: "Einstellungen", icon: Settings },
  { href: "/admin/waitlist", label: "Warteliste", icon: ListChecks },
  { href: "/admin/buildings", label: "Gebäude", icon: Building2 },
  { href: "/admin/rooms", label: "Räume", icon: Warehouse },
  { href: "/admin/organizations", label: "Organisationen", icon: Home },
  { href: "/admin/users", label: "Benutzer", icon: Users },
  { href: "/admin/roles", label: "Rollen/Rechte", icon: ShieldCheck },
  { href: "/admin/documents", label: "Dokumente", icon: FileText },
  { href: "/admin/access", label: "Zutritt", icon: KeyRound },
] as const;

type AdminNavigationProps = {
  items?: AdminNavigationItem[];
};

export function AdminNavigation({ items = adminNavigation }: AdminNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="mt-8 space-y-1" aria-label="Admin-Navigation">
      {items.map((item) => {
        const Icon = item.icon ?? defaultIconByHref[item.href] ?? LayoutDashboard;
        const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition",
              "hover:bg-accent hover:text-accent-foreground",
              active && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
