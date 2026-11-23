"use client";

import { useRef, useState } from "react";
import { Button } from "@/src/components/ui";

// PED-04: the code with "Copiar código"; same fallback as the PIX copy (select it so she copies it herself).
export function CopyTrackingCode({ code }: { code: string }) {
  const codeRef = useRef<HTMLParagraphElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      const range = document.createRange();
      if (codeRef.current) range.selectNodeContents(codeRef.current);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    }
  }

  return (
    <>
      <p ref={codeRef} className="bg-surface p-3 font-mono text-sm break-all">
        {code}
      </p>
      <Button variant="secondary" onClick={copy} className="w-full">
        Copiar código
      </Button>
      <p role="status" className="text-sm text-success">
        {copied ? "Código copiado" : ""}
      </p>
    </>
  );
}
