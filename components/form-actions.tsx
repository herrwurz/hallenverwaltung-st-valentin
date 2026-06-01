import Link from "next/link";

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
      <Link
        href={cancelHref}
        className="rounded-lg border border-slate-700 px-5 py-2 text-sm text-slate-200 hover:bg-slate-800"
      >
        {cancelLabel}
      </Link>
      <button
        type="submit"
        className="rounded-lg bg-sky-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400"
      >
        {submitLabel}
      </button>
    </div>
  );
}
