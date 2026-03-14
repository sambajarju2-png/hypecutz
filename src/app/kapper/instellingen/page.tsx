"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save, LogOut } from "lucide-react";

export default function BarberSettingsPage() {
  const { profile, signOut, refreshProfile, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [prepay, setPrepay] = useState(profile?.payment_pref_prepay || false);
  const [instore, setInstore] = useState(profile?.payment_pref_instore ?? true);
  const [credits, setCredits] = useState(profile?.payment_pref_credits || false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.id) return;
    setSaving(true);

    await supabase
      .from("profiles")
      .update({
        payment_pref_prepay: prepay,
        payment_pref_instore: instore,
        payment_pref_credits: credits,
      })
      .eq("id", profile.id);

    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-text-primary">Instellingen</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="card space-y-3">
          <h2 className="text-sm font-medium text-text-primary">Betaalmethoden</h2>
          <p className="text-xs text-text-secondary">Kies welke betaalopties je klanten aanbiedt.</p>

          <label className="flex items-center gap-3 p-3 bg-background-elevated rounded-input cursor-pointer">
            <input type="checkbox" checked={prepay} onChange={(e) => setPrepay(e.target.checked)} className="w-4 h-4 accent-accent" />
            <div>
              <p className="text-sm text-text-primary">Online betalen</p>
              <p className="text-[10px] text-text-secondary">iDEAL, Apple Pay, Google Pay</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-background-elevated rounded-input cursor-pointer">
            <input type="checkbox" checked={instore} onChange={(e) => setInstore(e.target.checked)} className="w-4 h-4 accent-accent" />
            <div>
              <p className="text-sm text-text-primary">Betalen in de winkel</p>
              <p className="text-[10px] text-text-secondary">Contant of pin bij aankomst</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-background-elevated rounded-input cursor-pointer">
            <input type="checkbox" checked={credits} onChange={(e) => setCredits(e.target.checked)} className="w-4 h-4 accent-accent" />
            <div>
              <p className="text-sm text-text-primary">Credits accepteren</p>
              <p className="text-[10px] text-text-secondary">Klanten betalen met tegoed</p>
            </div>
          </label>
        </div>

        <div className="card space-y-2">
          <h2 className="text-sm font-medium text-text-primary">Notificaties</h2>
          <p className="text-xs text-text-secondary">Push- en emailnotificaties worden geconfigureerd in Phase 8.</p>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Opslaan</>}
        </button>
        {saved && <p className="text-success text-sm text-center">Opgeslagen!</p>}
      </form>

      {/* Logout */}
      <button onClick={signOut} className="btn-secondary !text-danger !border-danger/30">
        <LogOut size={16} /> Uitloggen
      </button>
    </div>
  );
}
