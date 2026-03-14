"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Loader2, LogOut, CreditCard, Package, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface CreditPackage {
  id: string;
  total_amount_cents: number;
  remaining_amount_cents: number;
  expires_at: string;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

const CREDIT_AMOUNTS = [3000, 6000, 10000]; // €30, €60, €100

export default function CustomerProfilePage() {
  const { profile, signOut, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);

  const fetchPackages = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from("credit_packages")
      .select("id, total_amount_cents, remaining_amount_cents, expires_at")
      .eq("customer_id", profile.id)
      .gt("remaining_amount_cents", 0)
      .gte("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: true });
    setPackages((data as CreditPackage[]) || []);
    setLoadingPkgs(false);
  }, [profile?.id, supabase]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  async function purchaseCredits(amountCents: number) {
    setPurchasing(amountCents);
    try {
      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_cents: amountCents }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      alert(data.error || "Aankoop mislukt. Controleer of Mollie is ingesteld.");
    } catch {
      alert("Netwerkfout");
    }
    setPurchasing(null);
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  const totalBalance = packages.reduce((sum, p) => sum + p.remaining_amount_cents, 0);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Profiel</h1>

      {/* User info */}
      <div className="card flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-background-elevated flex items-center justify-center">
          <span className="text-lg font-bold text-accent">
            {profile?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{profile?.full_name || "Klant"}</p>
          <p className="text-xs text-text-secondary">{profile?.phone || "Geen telefoonnummer"}</p>
        </div>
      </div>

      {/* Credit balance */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={16} className="text-accent" />
          <h2 className="text-sm font-medium text-text-primary">Mijn credits</h2>
        </div>

        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-2xl font-bold text-accent">{formatCents(totalBalance)}</span>
          <span className="text-xs text-text-secondary">beschikbaar</span>
        </div>

        {/* Active packages */}
        {loadingPkgs ? (
          <div className="flex justify-center py-4">
            <Loader2 size={16} className="animate-spin text-text-secondary" />
          </div>
        ) : packages.length > 0 ? (
          <div className="space-y-2 mb-4">
            {packages.map((pkg) => (
              <div key={pkg.id} className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <p className="text-xs text-text-primary">
                    {formatCents(pkg.remaining_amount_cents)} van {formatCents(pkg.total_amount_cents)}
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    Verloopt {format(new Date(pkg.expires_at), "d MMM yyyy", { locale: nl })}
                  </p>
                </div>
                <Package size={14} className="text-text-secondary" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-secondary mb-4">
            Je hebt nog geen credits. Koop een pakket om te beginnen.
          </p>
        )}

        {/* Buy credits */}
        <div className="space-y-2">
          <p className="text-xs text-text-secondary">Credits kopen</p>
          <div className="grid grid-cols-3 gap-2">
            {CREDIT_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => purchaseCredits(amount)}
                disabled={purchasing !== null}
                className={`py-3 rounded-button text-sm font-medium transition-colors ${
                  purchasing === amount
                    ? "bg-accent text-background"
                    : "bg-background-elevated text-text-primary hover:bg-accent/20 hover:text-accent"
                }`}
              >
                {purchasing === amount ? (
                  <Loader2 size={14} className="animate-spin mx-auto" />
                ) : (
                  formatCents(amount)
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <div className="space-y-2">
        <a href="/afspraken" className="card flex items-center justify-between hover:border-accent/50 transition-colors">
          <span className="text-sm text-text-primary">Mijn afspraken</span>
          <ChevronRight size={16} className="text-text-secondary" />
        </a>
      </div>

      {/* Logout */}
      <button onClick={signOut} className="btn-secondary !text-danger !border-danger/30">
        <LogOut size={16} /> Uitloggen
      </button>
    </div>
  );
}
