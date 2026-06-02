import Link from "next/link";

type AppBackLinkProps = {
  href: string;
  label: string;
};

export function AppBackLink({ href, label }: AppBackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex rounded-sm border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm hover:bg-slate-50 hover:text-blue-900"
    >
      {label}
    </Link>
  );
}
