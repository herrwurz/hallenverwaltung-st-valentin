import { AppFeedback } from "@/components/app-feedback";

type AdminFeedbackProps = {
  saved?: string;
  error?: string;
};

export function AdminFeedback({ saved, error }: AdminFeedbackProps) {
  return (
    <AppFeedback
      className="mb-6"
      messages={[
        { tone: "error", text: error },
        { tone: "success", text: saved ? "Stammdaten wurden gespeichert." : undefined },
      ]}
    />
  );
}
