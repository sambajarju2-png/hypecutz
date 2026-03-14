"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Calendar, Star, Scissors, User, Clock } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { nl } from "date-fns/locale";

interface TodayAppointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  customer: { full_name: string } | null;
  service: { name: string; price_cents: number } | null;
}

export default function BarberDashboardPage() {
  const { profile, signOut, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [todayAppts, setTodayAppts] = useState<TodayAppointment[]>([]);
  const [serviceCount, setServiceCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const now = new Date();

    const [apptsRes, servicesRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, starts_at, ends_at, status, customer:profiles!appointments_customer_id_fkey(full_name), service:services(name, price_cents)")
        .eq("barber_id", profile.id)
        .gte("starts_at", startOfDay(now).toISOString())
        .lte("starts_at", endOfDay(now).toISOString())
        .in("status", ["confirmed", "completed"])
        .order("starts_at"),
      supabase
        .from("services")
        .select("id")
        .eq("barber_id", profile.id)
        .eq("is_active", true),
    ]);

    setTodayAppts((apptsRes.data as unknown as TodayAppointment[]) || []);
    setServiceCount((servicesRes.data || []).length);
    setLoading(false);
  }, [profile?.id, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary text-sm">Welkom terug,</p>
          <h1 className="text-xl font-bold text-text-primary">{profile?.full_name || "Kapper"}</h1>
        </div>
        <div className="flex gap-2">
          <a href="/kapper/profiel" className="p-2 rounded-button hover:bg-background-elevated transition-colors">
            <User size={20} className="text-text-secondary" />
          </a>
          <button onClick={signOut} className="p-2 rounded-button hover:bg-background-elevated transition-colors">
            <LogOut size={20} className="text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <Calendar size={18} className="text-accent mx-auto mb-1" />
          <p className="text-lg font-bold text-text-primary">{loading ? "—" : todayAppts.length}</p>
          <p className="text-[10px] text-text-secondary">Vandaag</p>
        </div>
        <a href="/kapper/services" className="card text-center hover:border-accent/50 transition-colors">
          <Scissors size={18} className="text-accent mx-auto mb-1" />
          <p className="text-lg font-bold text-text-primary">{loading ? "—" : serviceCount}</p>
          <p className="text-[10px] text-text-secondary">Behandelingen</p>
        </a>
        <div className="card text-center">
          <Star size={18} className="text-accent mx-auto mb-1" />
          <p className="text-lg font-bold text-text-primary">—</p>
          <p className="text-[10px] text-text-secondary">Beoordeling</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <a href="/kapper/services" className="card hover:border-accent/50 transition-colors">
          <Scissors size={16} className="text-accent mb-1" />
          <p className="text-sm font-medium text-text-primary">Behandelingen</p>
          <p className="text-[10px] text-text-secondary">Beheer je services</p>
        </a>
        <a href="/kapper/profiel" className="card hover:border-accent/50 transition-colors">
          <User size={16} className="text-accent mb-1" />
          <p className="text-sm font-medium text-text-primary">Profiel</p>
          <p className="text-[10px] text-text-secondary">Bewerk je gegevens</p>
        </a>
      </div>

      {/* Today's appointments */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-3">Afspraken vandaag</h2>
        {loading ? (
          <div className="card animate-pulse"><div className="h-12 bg-background-elevated rounded" /></div>
        ) : todayAppts.length === 0 ? (
          <div className="card">
            <p className="text-text-secondary text-sm text-center">Geen afspraken voor vandaag.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayAppts.map((apt) => (
              <div key={apt.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                  <Clock size={16} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {apt.customer?.full_name || "Klant"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {format(new Date(apt.starts_at), "HH:mm", { locale: nl })} · {apt.service?.name || "—"}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                  apt.status === "completed" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"
                }`}>
                  {apt.status === "completed" ? "Klaar" : "Bevestigd"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
