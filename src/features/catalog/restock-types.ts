export type RestockState = {
  status: "idle" | "saved" | "error";
  message: string | null;
  channel: "email" | "whatsapp";
  contact: string;
};
