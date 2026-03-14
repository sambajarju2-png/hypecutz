"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Loader2, MapPin, Clock, MessageCircle, CreditCard } from "lucide-react";
import { format, isPast } from "date-fns";
import { nl } from "date-fns/locale";
import EnterCreditCode from "@/components/credits/EnterCreditCode";

interface AppointmentWithDetails {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  payment_method: string;
  payment_status: string;
  notes: string | null;
  barber: { id: string; full_name: string; avatar_url: string | null } | null;
  service: { name: string; price_cents: number; duration_minutes: number } | null;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

const STATUS_LABELS: Record<string, string> = {
  pending: "In afwachting",
  confirmed: "Bevestigd",
  cancelled: "Geannuleerd",
  completed: "Voltooid",
  no_show: "No-show",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  confirmed: "bg-accent/10 text-accent",
  cancelled: "bg-danger/10 text-danger",
  completed: "bg-success/10 text-success",
  no_show: "bg-danger/10 text-danger",
};

export default function AppointmentsPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [showCreditCode, setShowCreditCode] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select(`
        id, starts_at, ends_at, status, payment_method, payment_status, notes,
        barber:profiles!appointments_barber_id_fkey(id, full_name, avatar_url),
        service:services(name, price_cents, duration_minutes)
      `)
      .eq("customer_id", profile.id)
      .order("starts_at", { ascending: false });

    setAppointments((data as unknown as AppointmentWithDetails[]) || []);
    setLoading(false);
  }, [profile?.id, supabase]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  
  const upcoming = appointments.filter((a) =>
    !isPast(new Date(a.starts_at)) && ["pending", "confirmed"].includes(a.status)
  );
  const past = appointments.filter((a) =>
    isPast(new Date(a.starts_at)) || ["completed", "cancelled", "no_show"].includes(a.status)
  );

  const display = tab === "upcoming" ? upcoming : past;

  // Detect platform for map link
  function getMapLink() {
    const address = encodeURIComponent("Schiedamseweg 28A, 3025 AB Rotterdam");
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      return `https://maps.apple.com/?q=${address}`;
    }
    return `https://maps.google.com/?q=${address}`;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Mijn Afspraken</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("upcoming")}
          className={`flex-1 py-2.5 text-sm rounded-button font-medium transition-colors ${
            tab === "upcoming" ? "bg-accent text-background" : "bg-background-elevated text-text-secondary"
          }`}
        >
          Aankomend ({upcoming.length})
        </button>
        <button
          onClick={() => setTab("past")}
          className={`flex-1 py-2.5 text-sm rounded-button font-medium transition-colors ${
            tab === "past" ? "bg-accent text-background" : "bg-background-elevated text-text-secondary"
          }`}
        >
          Verleden ({past.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      ) : display.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-text-secondary text-sm">
            {tab === "upcoming" ? "Geen aankomende afspraken." : "Geen eerdere afspraken."}
          </p>
          {tab === "upcoming" && (
            <a href="/boeken" className="inline-block mt-3 text-accent text-sm font-medium">
              Boek een afspraak →
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {display.map((apt) => (
            <div key={apt.id} className="card space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-background-elevated flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {apt.barber?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={apt.barber.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-accent">
                        {apt.barber?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {apt.barber?.full_name || "Onbekend"}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {apt.service?.name} · {apt.service ? formatCents(apt.service.price_cents) : ""}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${STATUS_COLORS[apt.status] || ""}`}>
                  {STATUS_LABELS[apt.status] || apt.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-text-secondary">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{format(new Date(apt.starts_at), "EEE d MMM, HH:mm", { locale: nl })}</span>
                </div>
              </div>

              {/* Actions for upcoming */}
              {tab === "upcoming" && apt.status === "confirmed" && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <a
                      href={getMapLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 text-[10px] bg-background-elevated text-text-primary rounded-button hover:bg-accent/10 transition-colors"
                    >
                      <MapPin size={12} /> Toon locatie
                    </a>
                    <a
                      href={`/chat/${apt.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 text-[10px] bg-background-elevated text-text-primary rounded-button hover:bg-accent/10 transition-colors"
                    >
                      <MessageCircle size={12} /> Chat
                    </a>
                    {apt.payment_method === "credits" && apt.payment_status !== "paid" && (
                      <button
                        onClick={() => setShowCreditCode(showCreditCode === apt.id ? null : apt.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-[10px] bg-accent/10 text-accent rounded-button hover:bg-accent/20 transition-colors"
                      >
                        <CreditCard size={12} /> Betaal met credits
                      </button>
                    )}
                  </div>
                  {/* Credit code entry */}
                  {showCreditCode === apt.id && apt.service && (
                    <EnterCreditCode
                      appointmentId={apt.id}
                      servicePriceCents={apt.service.price_cents}
                      onComplete={() => { setShowCreditCode(null); fetchAppointments(); }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
