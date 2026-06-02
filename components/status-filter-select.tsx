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
      <label className="text-sm text-slate-700">
        {label}
        <select
          name="status"
          defaultValue={selectedValue}
          className="mt-1 min-w-72 rounded-sm border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900"
        >
          {options.map((option) => (
            <option key={option.value || "default"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button className="rounded-sm border border-blue-700 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Anwenden
      </button>
    </form>
  );
}
