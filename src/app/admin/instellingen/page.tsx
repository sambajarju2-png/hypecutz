"use client";

import { useState } from "react";
import { Loader2, Save, Clock, Euro, Calendar } from "lucide-react";

const DAYS = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];

interface SalonHours {
  day: string;
  open: string;
  close: string;
  isOpen: boolean;
}

const DEFAULT_HOURS: SalonHours[] = DAYS.map((day, i) => ({
  day,
  open: "09:00",
  close: i === 5 ? "20:00" : "18:00",
  isOpen: i !== 0, // Closed on Sunday
}));

const DEFAULT_PACKAGES = [3000, 6000, 10000];

export default function AdminSettingsPage() {
  const [salonName, setSalonName] = useState("Hypecutz");
  const [address, setAddress] = useState("Schiedamseweg 28A, 3025 AB Rotterdam");
  const [phone, setPhone] = useState("+31 10 1234567");
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [newPackage, setNewPackage] = useState("");
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateHours(index: number, field: keyof SalonHours, value: string | boolean) {
    setHours((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  }

  function addPackage() {
    const amount = Math.round(parseFloat(newPackage) * 100);
    if (amount > 0 && !packages.includes(amount)) {
      setPackages([...packages, amount].sort((a, b) => a - b));
      setNewPackage("");
    }
  }

  function removePackage(amount: number) {
    setPackages(packages.filter((p) => p !== amount));
  }

  function addHoliday() {
    if (newHoliday && !holidays.includes(newHoliday)) {
      setHolidays([...holidays, newHoliday].sort());
      setNewHoliday("");
    }
  }

  function removeHoliday(date: string) {
    setHolidays(holidays.filter((h) => h !== date));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // TODO: persist to a salon_settings table or KV store
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-text-primary">Instellingen</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Salon info */}
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
            <input type="tel" className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        {/* Opening hours */}
        <div className="card space-y-3">
          <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
            <Clock size={14} className="text-accent" /> Openingstijden
          </h2>
          <div className="space-y-2">
            {hours.map((h, i) => (
              <div key={h.day} className="flex items-center gap-3">
                <label className="flex items-center gap-2 min-w-[110px]">
                  <input type="checkbox" checked={h.isOpen} onChange={(e) => updateHours(i, "isOpen", e.target.checked)} className="w-4 h-4 accent-accent" />
                  <span className={`text-sm ${h.isOpen ? "text-text-primary" : "text-text-secondary line-through"}`}>{h.day}</span>
                </label>
                {h.isOpen && (
                  <div className="flex items-center gap-2">
                    <input type="time" value={h.open} onChange={(e) => updateHours(i, "open", e.target.value)} className="input-field !w-auto !h-9 text-sm" />
                    <span className="text-text-secondary text-sm">–</span>
                    <input type="time" value={h.close} onChange={(e) => updateHours(i, "close", e.target.value)} className="input-field !w-auto !h-9 text-sm" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Credit packages */}
        <div className="card space-y-3">
          <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
            <Euro size={14} className="text-accent" /> Creditpakket bedragen
          </h2>
          <p className="text-xs text-text-secondary">Bedragen die klanten kunnen kopen als creditpakket.</p>
          <div className="flex flex-wrap gap-2">
            {packages.map((amount) => (
              <div key={amount} className="flex items-center gap-1 px-3 py-1.5 bg-background-elevated rounded-full">
                <span className="text-sm text-text-primary">€{(amount / 100).toFixed(0)}</span>
                <button type="button" onClick={() => removePackage(amount)} className="text-text-secondary hover:text-danger text-xs ml-1">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" placeholder="Bedrag (€)" value={newPackage} onChange={(e) => setNewPackage(e.target.value)} className="input-field !h-10 text-sm flex-1" min="1" step="5" />
            <button type="button" onClick={addPackage} className="px-4 py-2 bg-accent text-background rounded-button text-sm font-medium">Toevoegen</button>
          </div>
        </div>

        {/* Holidays */}
        <div className="card space-y-3">
          <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
            <Calendar size={14} className="text-accent" /> Vakantiedagen & feestdagen
          </h2>
          <p className="text-xs text-text-secondary">Op deze datums worden alle boekingen geblokkeerd.</p>
          {holidays.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {holidays.map((date) => (
                <div key={date} className="flex items-center gap-1 px-3 py-1.5 bg-background-elevated rounded-full">
                  <span className="text-sm text-text-primary">{date}</span>
                  <button type="button" onClick={() => removeHoliday(date)} className="text-text-secondary hover:text-danger text-xs ml-1">✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input type="date" value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)} className="input-field !h-10 text-sm flex-1" min={new Date().toISOString().split("T")[0]} />
            <button type="button" onClick={addHoliday} className="px-4 py-2 bg-accent text-background rounded-button text-sm font-medium">Toevoegen</button>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={16} /> Opslaan</>}
        </button>
        {saved && <p className="text-success text-sm text-center">Opgeslagen!</p>}
      </form>
    </div>
  );
}
