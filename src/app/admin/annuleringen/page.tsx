"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { nl } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";

interface CancelledAppointment {
  id: string;
  starts_at: string;
  cancelled_at: string;
  customer: { full_name: string } | null;
  barber: { full_name: string } | null;
}

interface NoShowCustomer {
  id: string;
  full_name: string;
  no_show_count: number;
}

export default function AdminCancellationsPage() {
  const [cancellations, setCancellations] = useState<CancelledAppointment[]>([]);
  const [noShows, setNoShows] = useState<NoShowCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"cancellations" | "noshows">("cancellations");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/appointments?status=cancelled");
    const data = await res.json();
    setCancellations(data.appointments || []);

    const supabase = createClient();
    const { data: customers } = await supabase
      .from("profiles")
      .select("id, full_name, no_show_count")
      .eq("role", "customer")
      .gt("no_show_count", 0)
      .order("no_show_count", { ascending: false });
    setNoShows((customers as NoShowCustomer[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Annuleringen & No-Shows</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("cancellations")}
          className={`px-4 py-2 text-sm rounded-button transition-colors ${
            tab === "cancellations" ? "bg-accent text-background" : "bg-background-elevated text-text-secondary"
          }`}
        >
          Annuleringen
        </button>
        <button
          onClick={() => setTab("noshows")}
          className={`px-4 py-2 text-sm rounded-button transition-colors ${
            tab === "noshows" ? "bg-accent text-background" : "bg-background-elevated text-text-secondary"
          }`}
        >
          No-Show ranglijst
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      ) : tab === "cancellations" ? (
        cancellations.length === 0 ? (
          <div className="card text-center">
            <p className="text-text-secondary text-sm">Geen annuleringen gevonden.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cancellations.map((apt) => {
              const hoursBeforeStr = apt.cancelled_at
                ? differenceInHours(new Date(apt.starts_at), new Date(apt.cancelled_at))
                : null;
              const isLate = hoursBeforeStr !== null && hoursBeforeStr < 2;

              return (
                <div key={apt.id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {apt.customer?.full_name || "Onbekend"}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {format(new Date(apt.starts_at), "d MMM yyyy, HH:mm", { locale: nl })}
                        {" · "}Kapper: {apt.barber?.full_name || "—"}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                      isLate ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                    }`}>
                      {hoursBeforeStr !== null ? `${hoursBeforeStr}u van tevoren` : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        noShows.length === 0 ? (
          <div className="card text-center">
            <p className="text-text-secondary text-sm">Geen no-shows geregistreerd.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {noShows.map((customer) => (
              <div key={customer.id} className="card flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {customer.full_name || "Onbekend"}
                  </p>
                </div>
                <span className="text-sm font-bold text-danger">
                  {customer.no_show_count}× no-show
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
