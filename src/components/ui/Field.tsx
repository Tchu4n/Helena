import { AlertIcon } from "./icons.tsx";

type FieldProps = {
  label: string;
  name: string;
  type?: "text" | "email" | "tel" | "search";
  defaultValue?: string;
  error?: string | null;
  inputMode?: "text" | "numeric" | "email" | "tel" | "search";
  autoComplete?: string;
  maxLength?: number;
};

// Label above, 48px tall, error shown with border + icon + text (DESIGN.md, section 5).
export function Field({ label, name, type = "text", defaultValue, error, inputMode, autoComplete, maxLength }: FieldProps) {
  const errorId = `${name}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-12 rounded-control border bg-card px-4 text-base ${error ? "border-2 border-error" : "border-control"}`}
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
