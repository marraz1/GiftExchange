"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Kopijuoti nuorodą" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          window.prompt("Nukopijuokite nuorodą:", text);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Nukopijuota ✓" : label}
    </button>
  );
}
