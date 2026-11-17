import Link from "next/link";
import { AlertIcon } from "./icons.tsx";

// GER-06: message in Portuguese, with an icon, no technical code, and "Tentar de novo".
// retryHref keeps the current address, so filters and search are not lost.
export function ErrorMessage({ title, retryHref }: { title: string; retryHref: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <AlertIcon className="size-8 text-error" />
      <p className="max-w-[32ch] text-base">{title}</p>
      <Link
        href={retryHref}
        className="inline-flex min-h-12 items-center rounded-control border border-control bg-card px-6 font-medium"
      >
        Tentar de novo
      </Link>
    </div>
  );
}
