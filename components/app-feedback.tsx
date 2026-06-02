type FeedbackMessage = {
  tone?: "success" | "error" | "warning" | "info";
  text: string | undefined;
};

type AppFeedbackProps = {
  messages: FeedbackMessage[];
  className?: string;
};

const toneClasses: Record<Required<FeedbackMessage>["tone"], string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  error: "border-red-300 bg-red-50 text-red-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  info: "border-blue-300 bg-blue-50 text-blue-900",
};

const toneLabels: Record<Required<FeedbackMessage>["tone"], string> = {
  success: "Erfolgreich",
  error: "Fehler",
  warning: "Hinweis",
  info: "Information",
};

export function AppFeedback({ messages, className = "mt-6" }: AppFeedbackProps) {
  const visibleMessages = messages.filter((message) => message.text);

  if (visibleMessages.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`} role="status" aria-live="polite">
      {visibleMessages.map((message, index) => {
        const tone = message.tone ?? "info";

        return (
          <p key={`${tone}-${index}`} className={`rounded-sm border px-4 py-3 text-sm shadow-sm ${toneClasses[tone]}`}>
            <span className="mr-2 font-semibold">{toneLabels[tone]}:</span>
            {message.text}
          </p>
        );
      })}
    </div>
  );
}
