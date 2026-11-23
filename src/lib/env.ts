import "server-only";
import { z } from "zod";

// Outside production the mock server (npm run mock) is the default API.
// STORE_WHATSAPP: the store's number for "Não recebeu o código?" (IDT-06), digits only with country code.
// shortcut: the default is a placeholder; the owner supplies the real number before launch.
const whatsapp = z.string().regex(/^\d{12,13}$/);
const schema = z.object({
  API_URL:
    process.env.NODE_ENV === "production" ? z.url() : z.url().default("http://localhost:4010"),
  STORE_WHATSAPP: process.env.NODE_ENV === "production" ? whatsapp : whatsapp.default("5511900000000"),
});

const parsed = schema.parse({ API_URL: process.env.API_URL, STORE_WHATSAPP: process.env.STORE_WHATSAPP });

export const env = { apiUrl: parsed.API_URL, storeWhatsapp: parsed.STORE_WHATSAPP };
