import Link from "next/link";
import { Button } from "@/components/ui/button";

type FormActionsProps = {
  submitLabel: string;
  cancelHref: string;
  cancelLabel?: string;
};

export function FormActions({
  submitLabel,
  cancelHref,
  cancelLabel = "Abbrechen",
}: FormActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-3">
      <Button variant="outline" asChild>
        <Link href={cancelHref}>{cancelLabel}</Link>
      </Button>
      <Button type="submit">{submitLabel}</Button>
    </div>
  );
}
