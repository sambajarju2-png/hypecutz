"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

export default function AdminSettingsPage() {
  const [salonName, setSalonName] = useState("Hypecutz");
  const [address, setAddress] = useState("Schiedamseweg 28A, 3025 AB Rotterdam");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // TODO: Save to salon_settings table (Phase 12)
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-bold text-text-primary">Instellingen</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="card space-y-4">
          <h2 className="text-sm font-medium text-text-primary">Salon gegevens</h2>

          <div>
            <label className="block text-xs text-text-secondary mb-1">Salon naam</label>
            <input type="text" className="input-field" value={salonName} onChange={(e) => setSalonName(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">Adres</label>
            <input type="text" className="input-field" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">Telefoon</label>
            <input type="tel" className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+31..." />
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-sm font-medium text-text-primary">Credit pakketten</h2>
          <p className="text-xs text-text-secondary">
            Configureerbare pakketbedragen worden toegevoegd in Phase 7.
            Standaard bedragen: €30, €60, €100.
          </p>
        </div>

        <div className="card space-y-3">
          <h2 className="text-sm font-medium text-text-primary">Openingstijden & vakanties</h2>
          <p className="text-xs text-text-secondary">
            Salon openingstijden en vakantiedagen worden toegevoegd in Phase 12.
          </p>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={16} /> Opslaan</>}
        </button>
        {saved && <p className="text-success text-sm text-center">Opgeslagen!</p>}
      </form>
    </div>
  );
}
