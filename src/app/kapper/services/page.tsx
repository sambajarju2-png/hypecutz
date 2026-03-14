"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Pencil, X, Save } from "lucide-react";
import type { Service } from "@/types";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

interface ServiceFormData {
  name: string;
  description: string;
  price_cents: number;
  duration_minutes: number;
  buffer_after_minutes: number;
}

const EMPTY_FORM: ServiceFormData = {
  name: "", description: "", price_cents: 2500, duration_minutes: 30, buffer_after_minutes: 0,
};

export default function BarberServicesPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // service id or "new"
  const [form, setForm] = useState<ServiceFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("barber_id", profile.id)
      .order("created_at", { ascending: true });
    setServices((data as Service[]) || []);
    setLoading(false);
  }, [profile?.id, supabase]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  function startEdit(service?: Service) {
    if (service) {
      setEditing(service.id);
      setForm({
        name: service.name,
        description: service.description || "",
        price_cents: service.price_cents,
        duration_minutes: service.duration_minutes,
        buffer_after_minutes: service.buffer_after_minutes,
      });
    } else {
      setEditing("new");
      setForm(EMPTY_FORM);
    }
    setError(null);
  }

  async function handleSave() {
    if (!profile?.id || !form.name.trim()) {
      setError("Naam is verplicht");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      barber_id: profile.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_cents: form.price_cents,
      duration_minutes: form.duration_minutes,
      buffer_after_minutes: form.buffer_after_minutes,
      is_active: true,
    };

    if (editing === "new") {
      const { error: insertErr } = await supabase.from("services").insert(payload);
      if (insertErr) { setError("Kan service niet opslaan"); setSaving(false); return; }
    } else {
      const { error: updateErr } = await supabase.from("services").update(payload).eq("id", editing);
      if (updateErr) { setError("Kan service niet bijwerken"); setSaving(false); return; }
    }

    setSaving(false);
    setEditing(null);
    fetchServices();
  }

  async function toggleActive(service: Service) {
    await supabase.from("services").update({ is_active: !service.is_active }).eq("id", service.id);
    fetchServices();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Behandelingen</h1>
        {!editing && (
          <button onClick={() => startEdit()} className="flex items-center gap-1 px-3 py-2 bg-accent text-background rounded-button text-sm font-medium">
            <Plus size={14} /> Nieuw
          </button>
        )}
      </div>

      {/* Edit/Create form */}
      {editing && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-text-primary">
              {editing === "new" ? "Nieuwe behandeling" : "Bewerken"}
            </h2>
            <button onClick={() => setEditing(null)} className="text-text-secondary"><X size={16} /></button>
          </div>

          {error && <p className="text-danger text-xs">{error}</p>}

          <input
            type="text" placeholder="Naam (bijv. Fade, Knip + Baard)" className="input-field"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <textarea
            placeholder="Beschrijving (optioneel)" className="input-field !h-20 py-3 resize-none"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-text-secondary">Prijs (€)</label>
              <input
                type="number" step="0.50" min="0" className="input-field !h-10 text-sm"
                value={(form.price_cents / 100).toFixed(2)}
                onChange={(e) => setForm({ ...form, price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })}
              />
            </div>
            <div>
              <label className="text-[10px] text-text-secondary">Duur (min)</label>
              <input
                type="number" min="5" step="5" className="input-field !h-10 text-sm"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div>
              <label className="text-[10px] text-text-secondary">Buffer (min)</label>
              <input
                type="number" min="0" step="5" className="input-field !h-10 text-sm"
                value={form.buffer_after_minutes}
                onChange={(e) => setForm({ ...form, buffer_after_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={14} /> Opslaan</>}
          </button>
        </div>
      )}

      {/* Services list */}
      {services.length === 0 && !editing ? (
        <div className="card text-center">
          <p className="text-text-secondary text-sm">Nog geen behandelingen. Voeg je eerste toe.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map((service) => (
            <div key={service.id} className={`card ${!service.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{service.name}</p>
                    <span className="text-accent text-sm font-medium">{formatCents(service.price_cents)}</span>
                  </div>
                  {service.description && <p className="text-xs text-text-secondary mt-0.5">{service.description}</p>}
                  <p className="text-[10px] text-text-secondary mt-1">
                    {service.duration_minutes} min{service.buffer_after_minutes > 0 ? ` + ${service.buffer_after_minutes} min buffer` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(service)} className="p-1.5 text-text-secondary hover:text-accent transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => toggleActive(service)} className="p-1.5 text-text-secondary hover:text-accent transition-colors text-[10px]">
                    {service.is_active ? "Deactiveer" : "Activeer"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
