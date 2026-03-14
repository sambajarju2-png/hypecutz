"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";

interface CreditPackage {
  id: string;
  total_amount_cents: number;
  remaining_amount_cents: number;
  expires_at: string;
  created_at: string;
  customer: { full_name: string } | null;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency", currency: "EUR",
  }).format(cents / 100);
}

export default function AdminCreditsPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("credit_packages")
      .select("id, total_amount_cents, remaining_amount_cents, expires_at, created_at, customer:profiles!credit_packages_customer_id_fkey(full_name)")
      .order("created_at", { ascending: false });
    setPackages((data as unknown as CreditPackage[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const totalOutstanding = packages.reduce((sum, p) => sum + p.remaining_amount_cents, 0);
  const expiringCount = packages.filter((p) => {
    const expires = new Date(p.expires_at);
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    return expires <= in30Days && p.remaining_amount_cents > 0;
  }).length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Credit Pakketten</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-[10px] text-text-secondary">Totaal uitstaand</p>
          <p className="text-lg font-bold text-text-primary">{formatCents(totalOutstanding)}</p>
        </div>
        <div className="card">
          <p className="text-[10px] text-text-secondary">Verlopen binnen 30 dagen</p>
          <div className="flex items-center gap-1">
            {expiringCount > 0 && <AlertTriangle size={14} className="text-danger" />}
            <p className="text-lg font-bold text-text-primary">{expiringCount}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      ) : packages.length === 0 ? (
        <div className="card text-center">
          <p className="text-text-secondary text-sm">Nog geen creditpakketten. Worden beschikbaar in Phase 7.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {packages.map((pkg) => {
            const isExpired = new Date(pkg.expires_at) < new Date();
            return (
              <div key={pkg.id} className={`card ${isExpired ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {pkg.customer?.full_name || "Onbekend"}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Aankoopbedrag: {formatCents(pkg.total_amount_cents)} ·
                      Resterend: {formatCents(pkg.remaining_amount_cents)}
                    </p>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      Verloopt: {format(new Date(pkg.expires_at), "d MMM yyyy", { locale: nl })}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                    isExpired ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                  }`}>
                    {isExpired ? "Verlopen" : "Actief"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
