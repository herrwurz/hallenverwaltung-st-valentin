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
      <Link href={href} className="text-sm text-sky-300 hover:text-sky-200">
        {label}
      </Link>
    </div>
  );
}
