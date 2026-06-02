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
        className="rounded-sm border border-slate-700 bg-white px-5 py-2 text-sm text-slate-700 hover:bg-slate-100"
      >
        {cancelLabel}
      </Link>
      <button
        type="submit"
        className="rounded-sm border border-blue-700 bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        {submitLabel}
      </button>
    </div>
  );
}
