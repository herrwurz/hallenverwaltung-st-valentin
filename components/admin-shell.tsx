import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/logout-button";

const navigation = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Buchungsanträge" },
  { href: "/admin/calendar", label: "Kalender" },
  { href: "/admin/billing", label: "Abrechnung" },
  { href: "/admin/notifications", label: "Benachrichtigungen" },
  { href: "/admin/settings/calendar", label: "Einstellungen" },
  { href: "/admin/waitlist", label: "Warteliste" },
  { href: "/admin/buildings", label: "Gebäude" },
  { href: "/admin/rooms", label: "Räume" },
  { href: "/admin/organizations", label: "Organisationen" },
  { href: "/admin/users", label: "Benutzer" },
  { href: "/admin/roles", label: "Rollen/Rechte" },
];

type AdminShellProps = {
  children: ReactNode;
  navigationItems?: typeof navigation;
  userName?: string | null;
};

export function AdminShell({ children, navigationItems = navigation, userName }: AdminShellProps) {
  return (
    <main className="windows-shell admin-desktop min-h-screen text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="w-64 shrink-0 border-r border-slate-800 px-5 py-8">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-sky-400">Verwaltung</p>
          <h1 className="mt-3 text-xl font-semibold">Verwaltungsportal</h1>
          <nav className="mt-10 space-y-1" aria-label="Admin-Navigation">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-sm px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1 px-8 py-8">
          <header className="flex items-center justify-end gap-4 border-b border-slate-800 pb-5">
            {userName ? <span className="text-sm text-slate-400">{userName}</span> : null}
            <LogoutButton />
          </header>
          <div className="py-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
