"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Download, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  payment_method: string;
  payment_status: string;
  cancelled_at: string | null;
  created_at: string;
  customer: { id: string; full_name: string } | null;
  barber: { id: string; full_name: string } | null;
  service: { name: string; price_cents: number } | null;
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

function formatCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency", currency: "EUR",
  }).format(cents / 100);
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/admin/appointments?${params}`);
    const data = await res.json();
    setAppointments(data.appointments || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  async function updateStatus(appointmentId: string, newStatus: string) {
    setUpdating(appointmentId);
    await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment_id: appointmentId, status: newStatus }),
    });
    await fetchAppointments();
    setUpdating(null);
  }

  function exportCsv() {
    const header = "Datum,Tijd,Klant,Kapper,Behandeling,Betaalmethode,Status,Bedrag\n";
    const rows = appointments.map((a) => {
      const date = format(new Date(a.starts_at), "dd-MM-yyyy", { locale: nl });
      const time = format(new Date(a.starts_at), "HH:mm");
      return [
        date, time,
        a.customer?.full_name || "—",
        a.barber?.full_name || "—",
        a.service?.name || "—",
        a.payment_method,
        a.status,
        a.service ? formatCents(a.service.price_cents) : "—",
      ].join(",");
    }).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `afspraken-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Afspraken</h1>
        <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 text-sm bg-background-elevated text-text-primary rounded-button hover:bg-background-card transition-colors">
          <Download size={14} /> CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field !w-auto !h-10 pr-8 text-sm appearance-none"
          >
            <option value="">Alle statussen</option>
            <option value="pending">In afwachting</option>
            <option value="confirmed">Bevestigd</option>
            <option value="completed">Voltooid</option>
            <option value="cancelled">Geannuleerd</option>
            <option value="no_show">No-show</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-3 text-text-secondary pointer-events-none" />
        </div>
      </div>

      {/* Appointments list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="card text-center">
          <p className="text-text-secondary text-sm">Geen afspraken gevonden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map((apt) => (
            <div key={apt.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-text-primary">
                      {apt.customer?.full_name || "Onbekend"}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[apt.status] || ""}`}>
                      {STATUS_LABELS[apt.status] || apt.status}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {format(new Date(apt.starts_at), "EEEE d MMM yyyy, HH:mm", { locale: nl })}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Kapper: {apt.barber?.full_name || "—"} · {apt.service?.name || "—"} · {apt.service ? formatCents(apt.service.price_cents) : "—"}
                  </p>
                  <p className="text-[10px] text-text-secondary mt-0.5">
                    Betaling: {apt.payment_method} ({apt.payment_status})
                  </p>
                </div>

                {/* Status actions */}
                {apt.status === "confirmed" && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateStatus(apt.id, "completed")}
                      disabled={updating === apt.id}
                      className="text-[10px] px-2 py-1 bg-success/10 text-success rounded-full hover:bg-success/20 transition-colors"
                    >
                      {updating === apt.id ? "..." : "Voltooid"}
                    </button>
                    <button
                      onClick={() => updateStatus(apt.id, "no_show")}
                      disabled={updating === apt.id}
                      className="text-[10px] px-2 py-1 bg-danger/10 text-danger rounded-full hover:bg-danger/20 transition-colors"
                    >
                      No-show
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
