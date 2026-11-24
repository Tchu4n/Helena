"use client";

import { useEffect } from "react";
import { clearCepHistory } from "../cep-history.ts";

// PRO-15, review focus 4: on /cookies without "Funcionais", the CEP history is deleted at once.
export function ForgetCepHistory() {
  useEffect(() => clearCepHistory(), []);
  return null;
}
