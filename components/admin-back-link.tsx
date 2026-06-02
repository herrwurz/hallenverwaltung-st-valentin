import Link from "next/link";

type AdminBackLinkProps = {
  href?: string;
  label?: string;
};

export function AdminBackLink({
  href = "/admin",
  label = "Zurück zum Dashboard",
}: AdminBackLinkProps) {
  return (
    <div className="mt-8">
      <Link
        href={href}
        className="inline-flex rounded-sm border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-slate-50 hover:text-blue-900"
      >
        {label}
      </Link>
    </div>
  );
}
