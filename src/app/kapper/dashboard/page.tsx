"use client";

import { useAuth } from "@/components/AuthProvider";
import { LogOut, Calendar, Users, Star } from "lucide-react";

export default function BarberDashboardPage() {
  const { profile, signOut, loading } = useAuth();

  if (loading) {
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
          <h1 className="text-xl font-bold text-text-primary">
            {profile?.full_name || "Kapper"}
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

      {/* Quick stats — placeholder */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <Calendar size={20} className="text-accent mx-auto mb-1" />
          <p className="text-lg font-bold text-text-primary">0</p>
          <p className="text-[10px] text-text-secondary">Vandaag</p>
        </div>
        <div className="card text-center">
          <Users size={20} className="text-accent mx-auto mb-1" />
          <p className="text-lg font-bold text-text-primary">0</p>
          <p className="text-[10px] text-text-secondary">Deze week</p>
        </div>
        <div className="card text-center">
          <Star size={20} className="text-accent mx-auto mb-1" />
          <p className="text-lg font-bold text-text-primary">—</p>
          <p className="text-[10px] text-text-secondary">Beoordeling</p>
        </div>
      </div>

      {/* Upcoming appointments placeholder */}
      <div>
        <h2 className="text-lg font-medium text-text-primary mb-3">
          Afspraken vandaag
        </h2>
        <div className="card">
          <p className="text-text-secondary text-sm">
            Geen afspraken voor vandaag. Agenda wordt gebouwd in Phase 5.
          </p>
        </div>
      </div>
    </div>
  );
}
