import "server-only";
import { z } from "zod";

// Outside production the mock server (npm run mock) is the default API.
const schema = z.object({
  API_URL:
    process.env.NODE_ENV === "production" ? z.url() : z.url().default("http://localhost:4010"),
});

const parsed = schema.parse({ API_URL: process.env.API_URL });

export const env = { apiUrl: parsed.API_URL };
