"use client";

import { useEffect, useRef, useState } from "react";

const left = (expiresAt: string, now: number) => Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
const pad = (n: number) => String(n).padStart(2, "0");

// CHK-12, SAC-17: the time left, in words and numbers ("Sua reserva termina em 14:59"); calls onEnd once at zero.
export function ReservationTimer({ expiresAt, onEnd }: { expiresAt: string; onEnd?: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const ended = useRef(false);
  const seconds = left(expiresAt, now);

  useEffect(() => {
    ended.current = false;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (seconds > 0 || ended.current) return;
    ended.current = true;
    onEnd?.();
  }, [seconds, onEnd]);

  return (
    // The server and the browser read the clock a moment apart; the browser's value wins.
    <p role="timer" className="text-[0.9375rem] font-medium text-sale tabular-nums" suppressHydrationWarning>
      Sua reserva termina em {pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}
    </p>
  );
}
