import { Button } from "@/components/ui/button";

type StatusFilterOption = {
  value: string;
  label: string;
};

type StatusFilterSelectProps = {
  label?: string;
  selectedValue: string;
  options: StatusFilterOption[];
};

export function StatusFilterSelect({
  label = "Status filtern",
  selectedValue,
  options,
}: StatusFilterSelectProps) {
  return (
    <form className="mt-8 flex flex-wrap items-end gap-3" aria-label={label}>
      <label className="text-sm font-medium text-foreground">
        {label}
        <select
          name="status"
          defaultValue={selectedValue}
          className="mt-1 min-w-72 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {options.map((option) => (
            <option key={option.value || "default"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit">
        Anwenden
      </Button>
    </form>
  );
}
