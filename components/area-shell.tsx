import type { ReactNode } from "react";
import { LogoutButton } from "@/components/logout-button";

type AreaShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  userName?: string | null;
  children?: ReactNode;
  authenticated?: boolean;
};

export function AreaShell({
  eyebrow,
  title,
  description,
  userName,
  children,
  authenticated = true,
}: AreaShellProps) {
  return (
    <main className="windows-shell app-area-shell min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{description}</p>
          </div>
          {authenticated ? (
            <div className="flex flex-col items-end gap-3">
              {userName ? <span className="text-sm text-muted-foreground">{userName}</span> : null}
              <LogoutButton />
            </div>
          ) : null}
        </header>
        {children}
      </div>
    </main>
  );
}
