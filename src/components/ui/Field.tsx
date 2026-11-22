import { AlertIcon } from "./icons.tsx";

// `name` sends the value with its form; `id` alone leaves it out (the simulated card fields).
type FieldProps = ({ name: string; id?: string } | { name?: undefined; id: string }) & {
  label: string;
  type?: "text" | "email" | "tel" | "search";
  defaultValue?: string;
  error?: string | null;
  inputMode?: "text" | "numeric" | "email" | "tel" | "search";
  autoComplete?: string;
  maxLength?: number;
  // Controlled use (checkout form): the value lives in the parent's state.
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
};

// Label above, 48px tall, error shown with border + icon + text (DESIGN.md, section 5).
export function Field({
  label,
  name,
  id = name!,
  type = "text",
  defaultValue,
  error,
  inputMode,
  autoComplete,
  maxLength,
  value,
  onChange,
  onBlur,
}: FieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onBlur={onBlur}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-12 w-full min-w-0 rounded-control border bg-card px-4 text-base ${error ? "border-2 border-error" : "border-control"}`}
      />
      {error && (
        <p id={errorId} className="flex items-start gap-1 text-sm text-error">
          <AlertIcon className="size-5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
