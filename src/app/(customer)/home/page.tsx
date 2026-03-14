"use client";

import { useAuth } from "@/components/AuthProvider";
import { LogOut } from "lucide-react";

export default function CustomerHomePage() {
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
            {profile?.full_name || "Klant"}
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

      {/* Quick book CTA */}
      <a href="/boeken" className="btn-primary block text-center">
        Boek een afspraak
      </a>

      {/* Feed placeholder */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-text-primary">Feed</h2>
        <div className="card">
          <p className="text-text-secondary text-sm">
            Barber feed wordt hier getoond — Phase 10.
          </p>
        </div>
      </div>
    </div>
  );
}
