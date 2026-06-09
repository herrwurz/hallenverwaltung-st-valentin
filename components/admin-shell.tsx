import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import { AdminNavigation, adminNavigation, type AdminNavigationItem } from "@/components/admin-navigation";
import { LogoutButton } from "@/components/logout-button";

type AdminShellProps = {
  children: ReactNode;
  navigationItems?: AdminNavigationItem[];
  userName?: string | null;
};

export function AdminShell({ children, navigationItems = adminNavigation, userName }: AdminShellProps) {
  return (
    <main className="windows-shell admin-desktop min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="sticky top-0 h-screen w-72 shrink-0 overflow-y-auto border-r px-5 py-6">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">St. Valentin</p>
              <h1 className="text-base font-semibold tracking-tight">Hallenverwaltung</h1>
            </div>
          </div>
          <AdminNavigation items={navigationItems} />
        </aside>
        <div className="min-w-0 flex-1 px-8 py-6">
          <header className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Verwaltungsportal
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Stammdaten, Buchungen, Kalender und Reports</p>
            </div>
            <div className="flex items-center gap-3">
              {userName ? <span className="text-sm text-muted-foreground">{userName}</span> : null}
              <LogoutButton />
            </div>
          </header>
          <div className="py-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
