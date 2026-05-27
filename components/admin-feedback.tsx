type AdminFeedbackProps = {
  saved?: string;
  error?: string;
};

export function AdminFeedback({ saved, error }: AdminFeedbackProps) {
  if (error) {
    return (
      <p className="mb-6 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-200">
        {error}
      </p>
    );
  }

  if (saved) {
    return (
      <p className="mb-6 rounded-lg border border-emerald-900 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-200">
        Stammdaten wurden gespeichert.
      </p>
    );
  }

  return null;
}
