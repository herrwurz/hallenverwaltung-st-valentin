import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDashboardRoute } from "@/lib/dashboard-route";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  redirect(getDashboardRoute(session.user.roles));
}
