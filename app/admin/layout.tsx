import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { requirePermission } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePermission("MANAGE_USERS");

  return <AdminShell userName={user.name}>{children}</AdminShell>;
}
