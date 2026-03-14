"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBooking } from "./BookingContext";
import { Loader2, CreditCard, Banknote, Coins, CheckCircle, Calendar, Scissors, User } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { PaymentMethod } from "@/types";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

const PAYMENT_OPTIONS: {
  method: PaymentMethod;
  label: string;
  desc: string;
  icon: typeof CreditCard;
  prefKey: "payment_pref_prepay" | "payment_pref_instore" | "payment_pref_credits";
}[] = [
  { method: "prepay", label: "Betaal nu", desc: "iDEAL, Apple Pay, Google Pay", icon: CreditCard, prefKey: "payment_pref_prepay" },
  { method: "instore", label: "Betaal in de winkel", desc: "Contant of pin bij aankomst", icon: Banknote, prefKey: "payment_pref_instore" },
  { method: "credits", label: "Gebruik credits", desc: "Betaal met je tegoed", icon: Coins, prefKey: "payment_pref_credits" },
];

export default function StepPayment() {
  const { state, setPaymentMethod, reset } = useBooking();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { barber, service, date, timeSlot, paymentMethod } = state;
  if (!barber || !service || !date || !timeSlot) return null;

  const startsAt = new Date(`${date}T${timeSlot}:00`);

  // Filter payment options based on barber's preferences
  const availableOptions = PAYMENT_OPTIONS.filter((opt) => {
    const pref = barber[opt.prefKey];
    return pref === true;
  });

  // If no options are enabled, show instore as fallback
  const displayOptions = availableOptions.length > 0 ? availableOptions : PAYMENT_OPTIONS.filter(o => o.method === "instore");

  async function handleConfirm() {
    if (!paymentMethod) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barber_id: barber!.id,
          service_id: service!.id,
          starts_at: startsAt.toISOString(),
          payment_method: paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kan afspraak niet aanmaken");
        setLoading(false);
        return;
      }

      if (data.requires_payment) {
        // Create Mollie payment and redirect to checkout
        const payRes = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointment_id: data.appointment_id }),
        });
        const payData = await payRes.json();

        if (!payRes.ok) {
          setError(payData.error || "Betaling aanmaken mislukt. Controleer of MOLLIE_API_KEY is ingesteld.");
          setLoading(false);
          return;
        }

        if (payData.checkout_url) {
          window.location.href = payData.checkout_url;
          return;
        }

        setError("Geen betaallink ontvangen");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Netwerkfout. Probeer het opnieuw.");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
          <CheckCircle size={32} className="text-success" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Afspraak bevestigd!</h2>
        <p className="text-text-secondary text-sm text-center">
          Je afspraak met {barber.full_name} op{" "}
          {format(startsAt, "EEEE d MMMM 'om' HH:mm", { locale: nl })} is bevestigd.
        </p>
        <div className="flex gap-3 w-full">
          <button
            onClick={() => router.push("/afspraken")}
            className="btn-primary flex-1"
          >
            Mijn afspraken
          </button>
          <button
            onClick={() => { reset(); }}
            className="btn-secondary flex-1"
          >
            Nieuwe boeking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="card space-y-3">
        <h2 className="text-sm font-medium text-text-secondary">Samenvatting</h2>

        <div className="flex items-center gap-3">
          <User size={16} className="text-accent" />
          <div>
            <p className="text-sm text-text-primary">{barber.full_name}</p>
            <p className="text-[10px] text-text-secondary">Kapper</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Scissors size={16} className="text-accent" />
          <div>
            <p className="text-sm text-text-primary">{service.name}</p>
            <p className="text-[10px] text-text-secondary">{service.duration_minutes} min · {formatCents(service.price_cents)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-accent" />
          <div>
            <p className="text-sm text-text-primary">
              {format(startsAt, "EEEE d MMMM yyyy", { locale: nl })}
            </p>
            <p className="text-[10px] text-text-secondary">{timeSlot} uur</p>
          </div>
        </div>

        <div className="border-t border-border pt-3 flex items-center justify-between">
          <span className="text-sm text-text-secondary">Totaal</span>
          <span className="text-lg font-bold text-accent">{formatCents(service.price_cents)}</span>
        </div>
      </div>

      {/* Payment method selection */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-text-secondary">Betaalmethode</h2>

        {displayOptions.map((opt) => {
          const Icon = opt.icon;
          const selected = paymentMethod === opt.method;
          return (
            <button
              key={opt.method}
              onClick={() => setPaymentMethod(opt.method)}
              className={`card w-full flex items-center gap-3 transition-colors ${
                selected ? "border-accent bg-accent/5" : "hover:border-accent/50"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selected ? "bg-accent/20" : "bg-background-elevated"
              }`}>
                <Icon size={18} className={selected ? "text-accent" : "text-text-secondary"} />
              </div>
              <div className="text-left">
                <p className={`text-sm font-medium ${selected ? "text-accent" : "text-text-primary"}`}>
                  {opt.label}
                </p>
                <p className="text-[10px] text-text-secondary">{opt.desc}</p>
              </div>
              {selected && (
                <div className="ml-auto">
                  <CheckCircle size={18} className="text-accent" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-input px-4 py-3 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!paymentMethod || loading}
        className="btn-primary"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          "Bevestig afspraak"
        )}
      </button>
    </div>
  );
}
