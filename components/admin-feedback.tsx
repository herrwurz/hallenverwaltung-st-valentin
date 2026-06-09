import { AppFeedback } from "@/components/app-feedback";

type AdminFeedbackProps = {
  saved?: string;
  closureSaved?: string;
  error?: string;
};

export function AdminFeedback({ saved, closureSaved, error }: AdminFeedbackProps) {
  return (
    <AppFeedback
      className="mb-6"
      messages={[
        { tone: "error", text: error },
        { tone: "success", text: saved ? "Stammdaten wurden gespeichert." : undefined },
        { tone: "success", text: closureSaved ? "Sperre wurde gespeichert." : undefined },
      ]}
    />
  );
}
