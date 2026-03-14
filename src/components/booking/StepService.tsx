"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBooking } from "./BookingContext";
import { Loader2, Clock } from "lucide-react";
import type { Service } from "@/types";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default function StepService() {
  const { state, setService } = useBooking();
  const supabase = createClient();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state.barber?.id) return;
    async function fetch() {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("barber_id", state.barber!.id)
        .eq("is_active", true)
        .order("price_cents");

      setServices((data as Service[]) || []);
      setLoading(false);
    }
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.barber?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-text-secondary text-sm">
          Deze kapper heeft nog geen behandelingen ingesteld.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {services.map((service) => (
        <button
          key={service.id}
          onClick={() => setService(service)}
          className="card w-full hover:border-accent/50 transition-colors text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">{service.name}</p>
              {service.description && (
                <p className="text-xs text-text-secondary mt-0.5">{service.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <Clock size={10} className="text-text-secondary" />
                <span className="text-[10px] text-text-secondary">{service.duration_minutes} min</span>
              </div>
            </div>
            <span className="text-accent font-bold text-sm whitespace-nowrap">
              {formatCents(service.price_cents)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
