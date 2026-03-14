"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, Loader2 } from "lucide-react";
import type { Profile } from "@/types";

export default function AdminBarbersPage() {
  const [barbers, setBarbers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const supabase = createClient();

  const fetchBarbers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "barber")
      .order("created_at", { ascending: false });

    setBarbers((data as Profile[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchBarbers();
  }, [fetchBarbers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteResult(null);

    try {
      const res = await fetch("/api/admin/invite-barber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          full_name: inviteName,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setInviteResult({ success: true, message: data.message });
        setInviteEmail("");
        setInviteName("");
        fetchBarbers();
      } else {
        setInviteResult({ error: data.error });
      }
    } catch {
      setInviteResult({ error: "Netwerkfout" });
    }

    setInviteLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Kappers</h1>
        <button
          onClick={() => setInviteOpen(!inviteOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-background
            rounded-button text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <UserPlus size={16} />
          Uitnodigen
        </button>
      </div>

      {/* Invite form */}
      {inviteOpen && (
        <form onSubmit={handleInvite} className="card space-y-3">
          <h2 className="text-sm font-medium text-text-primary">
            Nieuwe kapper uitnodigen
          </h2>

          {inviteResult?.success && (
            <div className="bg-success/10 border border-success/30 rounded-input px-4 py-3 text-success text-xs break-all">
              {inviteResult.message}
            </div>
          )}
          {inviteResult?.error && (
            <div className="bg-danger/10 border border-danger/30 rounded-input px-4 py-3 text-danger text-xs">
              {inviteResult.error}
            </div>
          )}

          <input
            type="text"
            placeholder="Volledige naam"
            className="input-field"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="E-mailadres"
            className="input-field"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={inviteLoading}
          >
            {inviteLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              "Verstuur uitnodiging"
            )}
          </button>
        </form>
      )}

      {/* Barbers list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : barbers.length === 0 ? (
        <div className="card">
          <p className="text-text-secondary text-sm text-center">
            Nog geen kappers. Nodig je eerste kapper uit.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {barbers.map((barber) => (
            <div key={barber.id} className="card flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-background-elevated flex items-center justify-center text-accent font-bold text-sm">
                {barber.full_name
                  ? barber.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-medium text-sm truncate">
                  {barber.full_name || "Onbekend"}
                </p>
                <p className="text-text-secondary text-xs">
                  {barber.is_active ? "Actief" : "Inactief — profiel niet voltooid"}
                </p>
              </div>
              <span
                className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                  barber.is_active
                    ? "bg-success/10 text-success"
                    : "bg-background-elevated text-text-secondary"
                }`}
              >
                {barber.is_active ? "Actief" : "Inactief"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
