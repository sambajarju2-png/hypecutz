"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { BarberSchedule, BarberBlock } from "@/types";

const DAY_NAMES = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];

export default function BarberAgendaPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [schedules, setSchedules] = useState<BarberSchedule[]>([]);
  const [blocks, setBlocks] = useState<BarberBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // New block form
  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");
  const [addingBlock, setAddingBlock] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const [schedRes, blocksRes] = await Promise.all([
      supabase.from("barber_schedules").select("*").eq("barber_id", profile.id).order("day_of_week"),
      supabase.from("barber_blocks").select("*").eq("barber_id", profile.id).order("blocked_date", { ascending: true }),
    ]);
    setSchedules((schedRes.data as BarberSchedule[]) || []);
    setBlocks((blocksRes.data as BarberBlock[]) || []);
    setLoading(false);
  }, [profile?.id, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function updateSchedule(dayOfWeek: number, field: string, value: string | boolean) {
    setSchedules((prev) =>
      prev.map((s) => (s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s))
    );
  }

  async function saveSchedules() {
    if (!profile?.id) return;
    setSaving(true);
    for (const sched of schedules) {
      await supabase
        .from("barber_schedules")
        .update({
          start_time: sched.start_time,
          end_time: sched.end_time,
          is_working: sched.is_working,
        })
        .eq("id", sched.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addBlock() {
    if (!profile?.id || !newBlockDate) return;
    setAddingBlock(true);
    await supabase.from("barber_blocks").insert({
      barber_id: profile.id,
      blocked_date: newBlockDate,
      reason: newBlockReason || null,
    });
    setNewBlockDate("");
    setNewBlockReason("");
    setAddingBlock(false);
    fetchData();
  }

  async function deleteBlock(blockId: string) {
    await supabase.from("barber_blocks").delete().eq("id", blockId);
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Agenda</h1>

      {/* Weekly schedule */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-text-secondary">Wekelijks rooster</h2>
        {schedules.map((sched) => (
          <div key={sched.id} className="card flex items-center gap-3">
            <label className="flex items-center gap-2 min-w-[100px]">
              <input
                type="checkbox"
                checked={sched.is_working}
                onChange={(e) => updateSchedule(sched.day_of_week, "is_working", e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <span className={`text-sm ${sched.is_working ? "text-text-primary" : "text-text-secondary line-through"}`}>
                {DAY_NAMES[sched.day_of_week]}
              </span>
            </label>
            {sched.is_working && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={sched.start_time.slice(0, 5)}
                  onChange={(e) => updateSchedule(sched.day_of_week, "start_time", e.target.value + ":00")}
                  className="input-field !w-auto !h-9 text-sm"
                />
                <span className="text-text-secondary text-sm">–</span>
                <input
                  type="time"
                  value={sched.end_time.slice(0, 5)}
                  onChange={(e) => updateSchedule(sched.day_of_week, "end_time", e.target.value + ":00")}
                  className="input-field !w-auto !h-9 text-sm"
                />
              </div>
            )}
          </div>
        ))}
        <button onClick={saveSchedules} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Rooster opslaan</>}
        </button>
        {saved && <p className="text-success text-sm text-center">Opgeslagen!</p>}
      </div>

      {/* Blocks (vacation, sick days) */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-text-secondary">Vrije dagen & blokkades</h2>

        {blocks.length === 0 ? (
          <p className="text-text-secondary text-xs">Geen blokkades ingesteld.</p>
        ) : (
          <div className="space-y-2">
            {blocks.map((block) => (
              <div key={block.id} className="card flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary">
                    {format(new Date(block.blocked_date + "T00:00:00"), "EEEE d MMMM yyyy", { locale: nl })}
                  </p>
                  {block.reason && <p className="text-xs text-text-secondary">{block.reason}</p>}
                </div>
                <button onClick={() => deleteBlock(block.id)} className="p-2 text-danger hover:bg-danger/10 rounded-button transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add block form */}
        <div className="card space-y-3">
          <p className="text-xs text-text-secondary">Nieuwe blokkade toevoegen</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={newBlockDate}
              onChange={(e) => setNewBlockDate(e.target.value)}
              className="input-field !h-10 text-sm flex-1"
              min={new Date().toISOString().split("T")[0]}
            />
            <input
              type="text"
              placeholder="Reden (optioneel)"
              value={newBlockReason}
              onChange={(e) => setNewBlockReason(e.target.value)}
              className="input-field !h-10 text-sm flex-1"
            />
          </div>
          <button onClick={addBlock} disabled={addingBlock || !newBlockDate} className="btn-secondary !h-10 text-sm">
            {addingBlock ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Toevoegen</>}
          </button>
        </div>
      </div>
    </div>
  );
}
