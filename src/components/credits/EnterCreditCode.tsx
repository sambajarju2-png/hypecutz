"use client";

import { useState } from "react";
import { Loader2, CheckCircle, AlertTriangle, CreditCard } from "lucide-react";

interface EnterCreditCodeProps {
  appointmentId: string;
  servicePriceCents: number;
  onComplete?: () => void;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default function EnterCreditCode({ appointmentId, servicePriceCents, onComplete }: EnterCreditCodeProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 4) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/credits/redeem", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: appointmentId, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.deficit_cents) {
          setError(`Onvoldoende tegoed. Je betaalt ${formatCents(data.deficit_cents)} bij in de winkel.`);
        } else {
          setError(data.error || "Code ongeldig of verlopen");
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
      onComplete?.();
    } catch {
      setError("Netwerkfout. Probeer opnieuw.");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="card text-center space-y-3 border-success/30">
        <CheckCircle size={36} className="text-success mx-auto" />
        <h3 className="text-base font-bold text-text-primary">Betaald met credits!</h3>
        <p className="text-xs text-text-secondary">
          {formatCents(servicePriceCents)} is afgeschreven van je tegoed.
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard size={16} className="text-accent" />
        <h3 className="text-sm font-medium text-text-primary">Betalen met credits</h3>
      </div>

      {/* Amount display */}
      <div className="bg-background-elevated rounded-input p-3 flex items-center justify-between">
        <span className="text-sm text-text-secondary">Bedrag</span>
        <span className="text-lg font-bold text-accent">{formatCents(servicePriceCents)}</span>
      </div>

      <p className="text-xs text-text-secondary">
        Vraag de code aan je kapper en voer deze hieronder in.
      </p>

      {error && (
        <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 rounded-input px-3 py-2">
          <AlertTriangle size={14} className="text-danger flex-shrink-0" />
          <p className="text-danger text-xs">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="Voer 4-cijferige code in"
          className="input-field text-center text-3xl tracking-[0.4em] font-mono !h-16"
          autoFocus
        />

        <button type="submit" disabled={code.length < 4 || loading} className="btn-primary">
          {loading ? <Loader2 size={16} className="animate-spin" /> : `Betaal ${formatCents(servicePriceCents)}`}
        </button>
      </form>
    </div>
  );
}
