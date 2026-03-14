"use client";

import { useState } from "react";
import { Loader2, QrCode, CheckCircle, AlertTriangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface RedeemCreditsProps {
  appointmentId: string;
  onComplete?: () => void;
}

export default function RedeemCredits({ appointmentId, onComplete }: RedeemCreditsProps) {
  const [step, setStep] = useState<"idle" | "code_generated" | "verifying" | "success" | "error">("idle");
  const [code, setCode] = useState<string>("");
  const [inputCode, setInputCode] = useState("");
  const [expiresIn, setExpiresIn] = useState(120);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Barber generates code
  async function generateCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/credits/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: appointmentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Code genereren mislukt");
        setLoading(false);
        return;
      }
      setCode(data.code);
      setExpiresIn(data.expires_in_seconds);
      setStep("code_generated");

      // Countdown timer
      const interval = setInterval(() => {
        setExpiresIn((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setStep("idle");
            setCode("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setError("Netwerkfout");
    }
    setLoading(false);
  }

  // Verify code entered by customer or barber confirming
  async function verifyCode() {
    if (!inputCode.trim() && !code) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/credits/redeem", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: appointmentId,
          code: inputCode || code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.deficit_cents) {
          setError(`Onvoldoende tegoed. Tekort: €${(data.deficit_cents / 100).toFixed(2)}`);
        } else {
          setError(data.error || "Verzilveren mislukt");
        }
        setStep("error");
        setLoading(false);
        return;
      }
      setStep("success");
      onComplete?.();
    } catch {
      setError("Netwerkfout");
      setStep("error");
    }
    setLoading(false);
  }

  if (step === "success") {
    return (
      <div className="card text-center space-y-3">
        <CheckCircle size={40} className="text-success mx-auto" />
        <h3 className="text-base font-bold text-text-primary">Credits verzilverd!</h3>
        <p className="text-xs text-text-secondary">Het tegoed is succesvol afgeschreven.</p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
        <QrCode size={16} className="text-accent" />
        Verzilver credits
      </h3>

      {error && (
        <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 rounded-input px-3 py-2">
          <AlertTriangle size={14} className="text-danger flex-shrink-0" />
          <p className="text-danger text-xs">{error}</p>
        </div>
      )}

      {step === "idle" && (
        <>
          <p className="text-xs text-text-secondary">
            Genereer een 4-cijferige code zodat de klant kan betalen met credits.
          </p>
          <button onClick={generateCode} disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Genereer code"}
          </button>
        </>
      )}

      {step === "code_generated" && (
        <>
          {/* Large code display */}
          <div className="bg-background-elevated rounded-card p-6 text-center">
            <p className="text-4xl font-bold text-accent tracking-[0.3em] font-mono">{code}</p>
            <p className="text-xs text-text-secondary mt-2">
              Verloopt over {Math.floor(expiresIn / 60)}:{(expiresIn % 60).toString().padStart(2, "0")}
            </p>
          </div>

          {/* QR code */}
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-card">
              <QRCodeSVG
                value={JSON.stringify({ appointment_id: appointmentId, code })}
                size={150}
                level="M"
              />
            </div>
          </div>

          <p className="text-[10px] text-text-secondary text-center">
            Laat de klant de code invoeren of de QR scannen.
          </p>

          {/* Manual verify button (barber confirms) */}
          <button onClick={verifyCode} disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Bevestig & verzilver"}
          </button>
        </>
      )}

      {step === "error" && (
        <>
          {/* Manual code entry fallback */}
          <div className="space-y-2">
            <p className="text-xs text-text-secondary">Voer de code handmatig in:</p>
            <input
              type="text"
              maxLength={6}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ""))}
              placeholder="Voer code in"
              className="input-field text-center text-2xl tracking-[0.3em] font-mono"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={verifyCode} disabled={loading || inputCode.length < 4} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Opnieuw proberen"}
            </button>
            <button onClick={() => { setStep("idle"); setError(null); setInputCode(""); }} className="btn-secondary flex-1">
              Annuleren
            </button>
          </div>
        </>
      )}
    </div>
  );
}
