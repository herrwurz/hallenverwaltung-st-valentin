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
        className="rounded-sm border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-400 hover:text-white"
      >
        Abmelden
      </button>
    </form>
  );
}
