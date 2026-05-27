import { redirect } from "next/navigation";
import { getDashboardRoute } from "@/lib/dashboard-route";
import { requireActiveSession } from "@/lib/permissions";

export default async function DashboardPage() {
  const user = await requireActiveSession();
  redirect(getDashboardRoute(user.roles));
}
