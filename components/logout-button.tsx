import { signOut } from "@/auth";

export function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className="rounded-sm border border-slate-400 bg-white px-4 py-2 text-sm text-slate-800 transition hover:bg-slate-100"
      >
        Abmelden
      </button>
    </form>
  );
}
