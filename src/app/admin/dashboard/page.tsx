"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  LogOut,
  TrendingUp,
  Calendar,
  Users,
  Star,
  CreditCard,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface AdminStats {
  revenue: { today: number; week: number; month: number };
  appointments: { today: number; week: number };
  barbers: { active: number; total: number };
  avgRating: string | null;
  credits: { activePackages: number; outstandingCents: number };
  topServices: { name: string; count: number }[];
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default function AdminDashboardPage() {
  const { profile, signOut, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Kan statistieken niet laden");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchStats();
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  const kpis = stats
    ? [
        {
          label: "Omzet deze maand",
          value: formatCents(stats.revenue.month),
          icon: TrendingUp,
        },
        {
          label: "Afspraken vandaag",
          value: stats.appointments.today.toString(),
          icon: Calendar,
        },
        {
          label: "Afspraken deze week",
          value: stats.appointments.week.toString(),
          icon: Calendar,
        },
        {
          label: "Actieve kappers",
          value: `${stats.barbers.active} / ${stats.barbers.total}`,
          icon: Users,
        },
        {
          label: "Gem. beoordeling",
          value: stats.avgRating ? `${stats.avgRating} ★` : "—",
          icon: Star,
        },
        {
          label: "Actieve creditpakketten",
          value: stats.credits.activePackages.toString(),
          icon: CreditCard,
          sub: `Uitstaand: ${formatCents(stats.credits.outstandingCents)}`,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary text-sm">Admin dashboard</p>
          <h1 className="text-xl font-bold text-text-primary">
            Welkom, {profile?.full_name || "Admin"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 rounded-button hover:bg-background-elevated transition-colors"
            aria-label="Ververs"
          >
            <RefreshCw
              size={18}
              className={`text-text-secondary ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={signOut}
            className="p-2 rounded-button hover:bg-background-elevated transition-colors"
            aria-label="Uitloggen"
          >
            <LogOut size={18} className="text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-input px-4 py-3 text-danger text-sm">
          {error}
        </div>
      )}

      {/* KPI cards */}
      {loading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-3 bg-background-elevated rounded w-24 mb-3" />
              <div className="h-7 bg-background-elevated rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {kpis.map(({ label, value, icon: Icon, sub }) => (
            <div key={label} className="card">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className="text-accent" />
                <p className="text-[11px] text-text-secondary">{label}</p>
              </div>
              <p className="text-xl font-bold text-text-primary">{value}</p>
              {sub && (
                <p className="text-[10px] text-text-secondary mt-1">{sub}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Top services */}
      {stats && stats.topServices.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-medium text-text-primary mb-3">
            Meest geboekte behandelingen (deze maand)
          </h2>
          <div className="space-y-2">
            {stats.topServices.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-text-primary">{s.name}</span>
                <span className="text-sm text-text-secondary">
                  {s.count}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href="/admin/afspraken"
          className="card hover:border-accent/50 transition-colors"
        >
          <Calendar size={18} className="text-accent mb-2" />
          <p className="text-sm font-medium text-text-primary">Afspraken</p>
          <p className="text-[10px] text-text-secondary">Beheer alle afspraken</p>
        </a>
        <a
          href="/admin/barbers"
          className="card hover:border-accent/50 transition-colors"
        >
          <Users size={18} className="text-accent mb-2" />
          <p className="text-sm font-medium text-text-primary">Kappers</p>
          <p className="text-[10px] text-text-secondary">Beheer je team</p>
        </a>
        <a
          href="/admin/reviews"
          className="card hover:border-accent/50 transition-colors"
        >
          <Star size={18} className="text-accent mb-2" />
          <p className="text-sm font-medium text-text-primary">Reviews</p>
          <p className="text-[10px] text-text-secondary">Modereer beoordelingen</p>
        </a>
        <a
          href="/admin/credits"
          className="card hover:border-accent/50 transition-colors"
        >
          <CreditCard size={18} className="text-accent mb-2" />
          <p className="text-sm font-medium text-text-primary">Credits</p>
          <p className="text-[10px] text-text-secondary">Pakketten overzicht</p>
        </a>
      </div>
    </div>
  );
}
