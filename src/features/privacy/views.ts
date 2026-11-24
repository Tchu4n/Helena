// CTA-08: the news consents as the Privacidade screen shows them. Pure, so the unit tests import it.
import type { components } from "@/src/lib/api-types";

// The API's news consent; the privacy domain's `Consent` is the cookie choice (GLOSSARY).
export type MarketingConsent = components["schemas"]["Consent"];
type Channel = MarketingConsent["channel"];

export type ConsentView = { channel: Channel; label: string; accepted: boolean; line: string };

// Checkout's texts (CHK-07), so "accepted" means the same text in both places.
const LABELS: Record<Channel, string> = {
  email: "Quero receber novidades por e-mail",
  whatsapp: "Quero receber novidades por WhatsApp",
};

const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

export function toConsentViews(consents: MarketingConsent[]): ConsentView[] {
  return (["email", "whatsapp"] as const).map((channel) => {
    const found = consents.find((c) => c.channel === channel);
    const accepted = found?.accepted === true;
    const date = found?.recordedAt ? day.format(new Date(found.recordedAt)) : null;
    const line = !date ? "Nunca aceito" : accepted ? `Aceito em ${date}` : `Cancelado em ${date}`;
    return { channel, label: LABELS[channel], accepted, line };
  });
}
