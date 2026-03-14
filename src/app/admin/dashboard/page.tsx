"use client";

import { useAuth } from "@/components/AuthProvider";
import { LogOut, TrendingUp, Calendar, Users, Star, CreditCard } from "lucide-react";

export default function AdminDashboardPage() {
  const { profile, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  const kpis = [
    { label: "Omzet vandaag", value: "€0", icon: TrendingUp },
    { label: "Afspraken vandaag", value: "0", icon: Calendar },
    { label: "Actieve kappers", value: "0", icon: Users },
    { label: "Gem. beoordeling", value: "—", icon: Star },
    { label: "Actieve credits", value: "€0", icon: CreditCard },
  ];

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
        <button
          onClick={signOut}
          className="p-2 rounded-button hover:bg-background-elevated transition-colors"
          aria-label="Uitloggen"
        >
          <LogOut size={20} className="text-text-secondary" />
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className="text-accent" />
              <p className="text-xs text-text-secondary">{label}</p>
            </div>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart placeholder */}
      <div className="card">
        <h2 className="text-lg font-medium text-text-primary mb-2">
          Omzet afgelopen 30 dagen
        </h2>
        <p className="text-text-secondary text-sm">
          Revenue chart wordt gebouwd in Phase 4.
        </p>
      </div>
    </div>
  );
}
