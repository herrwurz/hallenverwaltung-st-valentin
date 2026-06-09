import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminBackLinkProps = {
  href?: string;
  label?: string;
};

export function AdminBackLink({ href = "/admin", label = "Zurück zum Dashboard" }: AdminBackLinkProps) {
  return (
    <div className="mt-8">
      <Button variant="ghost" size="sm" asChild>
        <Link href={href}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {label}
        </Link>
      </Button>
    </div>
  );
}
