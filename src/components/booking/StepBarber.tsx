"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBooking } from "./BookingContext";
import { Loader2, Star } from "lucide-react";
import type { Profile } from "@/types";

export default function StepBarber() {
  const { setBarber } = useBooking();
  const supabase = createClient();
  const [barbers, setBarbers] = useState<(Profile & { avgRating?: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "barber")
        .eq("is_active", true);

      const barberList = (data as Profile[]) || [];

      // Fetch ratings for each barber
      const withRatings = await Promise.all(
        barberList.map(async (b) => {
          const { data: reviews } = await supabase
            .from("reviews")
            .select("rating")
            .eq("barber_id", b.id)
            .eq("is_hidden", false);

          const ratings = (reviews || []).map((r) => r.rating);
          const avgRating = ratings.length > 0
            ? parseFloat((ratings.reduce((a, c) => a + c, 0) / ratings.length).toFixed(1))
            : undefined;

          return { ...b, avgRating };
        })
      );

      setBarbers(withRatings);
      setLoading(false);
    }
    fetch();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  if (barbers.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-text-secondary text-sm">
          Er zijn nog geen kappers beschikbaar. Probeer het later opnieuw.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {barbers.map((barber) => (
        <button
          key={barber.id}
          onClick={() => setBarber(barber)}
          className="card w-full flex items-center gap-4 hover:border-accent/50 transition-colors text-left"
        >
          <div className="w-14 h-14 rounded-full bg-background-elevated flex-shrink-0 overflow-hidden flex items-center justify-center">
            {barber.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={barber.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-accent">
                {barber.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {barber.full_name}
            </p>
            {barber.bio && (
              <p className="text-xs text-text-secondary truncate">{barber.bio}</p>
            )}
            {barber.avgRating && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star size={10} className="text-accent fill-accent" />
                <span className="text-[10px] text-accent">{barber.avgRating}</span>
              </div>
            )}
          </div>
          <div className="text-accent text-sm">→</div>
        </button>
      ))}
    </div>
  );
}
