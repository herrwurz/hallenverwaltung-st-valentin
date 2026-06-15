import type { ReactNode } from "react";
import Image from "next/image";
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
          <div className="rounded-xl border border-border bg-white p-3 text-center shadow-sm">
            <Image
              src="/brand/logo-gde-transparent-500.gif"
              alt="Sankt Valentin meine Stadt"
              width={500}
              height={159}
              unoptimized
              className="mx-auto h-auto max-h-20 w-full object-contain"
            />
            <h1 className="mt-3 text-base font-semibold tracking-tight text-foreground">Hallenverwaltung</h1>
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
