"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Star, Clock, ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import type { Profile, Service } from "@/types";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

interface BarberData extends Profile {
  avgRating: number | null;
  reviewCount: number;
  services: Service[];
}

export default function BarberProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [barber, setBarber] = useState<BarberData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBarber = useCallback(async () => {
    setLoading(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", params.id)
      .eq("role", "barber")
      .single();

    if (!profile) { setLoading(false); return; }

    const [servicesRes, reviewsRes] = await Promise.all([
      supabase.from("services").select("*").eq("barber_id", params.id).eq("is_active", true).order("price_cents"),
      supabase.from("reviews").select("rating").eq("barber_id", params.id).eq("is_hidden", false),
    ]);

    const ratings = (reviewsRes.data || []).map((r) => r.rating);
    const avgRating = ratings.length > 0
      ? parseFloat((ratings.reduce((a, c) => a + c, 0) / ratings.length).toFixed(1))
      : null;

    setBarber({
      ...(profile as Profile),
      avgRating,
      reviewCount: ratings.length,
      services: (servicesRes.data as Service[]) || [],
    });
    setLoading(false);
  }, [params.id, supabase]);

  useEffect(() => { fetchBarber(); }, [fetchBarber]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="p-4">
        <div className="card text-center">
          <p className="text-text-secondary text-sm">Kapper niet gevonden.</p>
          <Link href="/home" className="text-accent text-sm mt-2 inline-block">← Terug</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/home" className="p-1">
          <ArrowLeft size={20} className="text-text-secondary" />
        </Link>
        <span className="text-sm font-medium text-text-primary">Kapper profiel</span>
      </div>

      {/* Profile header */}
      <div className="flex flex-col items-center px-4 pb-4">
        <div className="w-24 h-24 rounded-full bg-background-elevated border-2 border-accent overflow-hidden flex items-center justify-center mb-3">
          {barber.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={barber.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-accent">
              {barber.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-text-primary">{barber.full_name}</h1>
        {barber.bio && <p className="text-sm text-text-secondary text-center mt-1 max-w-xs">{barber.bio}</p>}

        {/* Rating + location */}
        <div className="flex items-center gap-4 mt-3">
          {barber.avgRating && (
            <div className="flex items-center gap-1">
              <Star size={14} className="text-accent fill-accent" />
              <span className="text-sm text-accent font-medium">{barber.avgRating}</span>
              <span className="text-xs text-text-secondary">({barber.reviewCount})</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <MapPin size={12} className="text-text-secondary" />
            <span className="text-xs text-text-secondary">Rotterdam</span>
          </div>
        </div>
      </div>

      {/* Book CTA */}
      <div className="px-4 mb-4">
        <Link
          href={`/boeken?barber=${barber.id}`}
          className="btn-primary block text-center"
        >
          Boek bij {barber.full_name?.split(" ")[0]}
        </Link>
      </div>

      {/* Services */}
      <div className="px-4 space-y-3">
        <h2 className="text-sm font-medium text-text-secondary">Behandelingen</h2>
        {barber.services.length === 0 ? (
          <div className="card">
            <p className="text-text-secondary text-sm text-center">Nog geen behandelingen.</p>
          </div>
        ) : (
          barber.services.map((service) => (
            <div key={service.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">{service.name}</p>
                  {service.description && (
                    <p className="text-xs text-text-secondary mt-0.5">{service.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={10} className="text-text-secondary" />
                    <span className="text-[10px] text-text-secondary">{service.duration_minutes} min</span>
                  </div>
                </div>
                <span className="text-accent font-bold text-sm">{formatCents(service.price_cents)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
