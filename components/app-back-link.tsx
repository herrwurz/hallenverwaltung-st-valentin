import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppBackLinkProps = {
  href: string;
  label: string;
};

export function AppBackLink({ href, label }: AppBackLinkProps) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={href}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {label}
      </Link>
    </Button>
  );
}
