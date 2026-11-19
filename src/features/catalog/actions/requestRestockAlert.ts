"use server";

import { z } from "zod";
import { apiPost } from "@/src/lib/api";
import { parseRestockContact } from "../restock.ts";
import type { RestockState } from "../restock-types.ts";

const input = z.object({
  productSizeId: z.uuid(),
  sizeLabel: z.string().max(20),
  channel: z.enum(["email", "whatsapp"]),
  contact: z.string().max(200),
});

// PRO-12. No authorization to check: the alert is anonymous, and the API limits attempts (429).
// What she typed always goes back in the state, so an error never clears the field (GER-06).
export async function requestRestockAlert(prev: RestockState, formData: FormData): Promise<RestockState> {
  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const sent = formData.get("channel");
    const channel = sent === "whatsapp" || sent === "email" ? sent : prev.channel;
    const contact = typeof formData.get("contact") === "string" ? String(formData.get("contact")).slice(0, 200) : "";
    return { status: "error", message: "Não foi possível concluir. Tente de novo", channel, contact };
  }
  const { productSizeId, sizeLabel, channel, contact } = parsed.data;

  const checked = parseRestockContact(channel, contact);
  if (!checked.ok) return { status: "error", message: checked.message, channel, contact };

  const result = await apiPost("/v1/restock-alerts", { productSizeId, channel, contact: checked.contact });
  if (!result.ok) return { status: "error", message: result.problem.title, channel, contact };
  return {
    status: "saved",
    message: `Pronto! Vamos avisar quando o tamanho ${sizeLabel} estiver disponível. Usaremos seu contato só para esse aviso.`,
    channel,
    contact,
  };
}
