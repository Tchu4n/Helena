import { DELETION_NOTICES } from "../types.ts";

// CTA-09: the status line of `?exclusao=` on /conta and /checkout; any other value shows nothing.
export function DeletionNotice({ value }: { value: string | string[] | undefined }) {
  const text = value === "pedida" || value === "cancelada" ? DELETION_NOTICES[value] : null;
  if (!text) return null;
  return (
    <p role="status" className="px-4 pt-4 text-sm text-success">
      {text}
    </p>
  );
}
