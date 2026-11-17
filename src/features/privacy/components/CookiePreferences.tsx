import { Button, CheckIcon } from "@/src/components/ui";
import type { Consent } from "../consent.ts";
import { saveConsent } from "../actions/saveConsent.ts";

const OPTIONAL = [
  {
    name: "analytics",
    label: "Análise",
    text: "Contam visitas e mostram quais páginas são mais usadas, para melhorar a loja.",
  },
  {
    name: "marketing",
    label: "Marketing",
    text: "Permitem mostrar anúncios da Helena em outros sites e redes sociais.",
  },
] as const;

const BOX = "size-6 shrink-0 accent-primary";

// GER-05: every category is described, and optional ones start unchecked.
export function CookiePreferences({ consent, saved }: { consent: Consent | null; saved: boolean }) {
  return (
    <form action={saveConsent} className="flex flex-col gap-6">
      <input type="hidden" name="choice" value="custom" />

      <label className="flex min-h-12 items-start gap-3">
        <input type="checkbox" checked disabled className={BOX} />
        <span>
          <span className="block font-medium">Necessários</span>
          <span className="block text-sm text-muted">
            Guardam a sacola e a sessão. Sem eles a loja não funciona, então ficam sempre ligados.
          </span>
        </span>
      </label>

      {OPTIONAL.map(({ name, label, text }) => (
        <label key={name} className="flex min-h-12 items-start gap-3">
          <input type="checkbox" name={name} defaultChecked={consent?.[name] ?? false} className={BOX} />
          <span>
            <span className="block font-medium">{label}</span>
            <span className="block text-sm text-muted">{text}</span>
          </span>
        </label>
      ))}

      <Button variant="primary" type="submit">
        Salvar preferências
      </Button>

      {saved && (
        <p role="status" className="flex items-center gap-2 text-success">
          <CheckIcon className="size-5" />
          Preferências salvas.
        </p>
      )}
    </form>
  );
}
