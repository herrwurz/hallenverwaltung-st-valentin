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
      <label className="text-sm text-slate-300">
        {label}
        <select
          name="status"
          defaultValue={selectedValue}
          className="mt-1 min-w-72 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        >
          {options.map((option) => (
            <option key={option.value || "default"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400">
        Anwenden
      </button>
    </form>
  );
}
