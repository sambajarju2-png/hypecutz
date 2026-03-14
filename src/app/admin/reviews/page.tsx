"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Eye, EyeOff, Star } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  barber_reply: string | null;
  is_anonymous: boolean;
  is_hidden: boolean;
  created_at: string;
  customer: { full_name: string } | null;
  barber: { full_name: string } | null;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/reviews");
    const data = await res.json();
    setReviews(data.reviews || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Reviews</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="card text-center">
          <p className="text-text-secondary text-sm">Nog geen reviews.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => (
            <div key={review.id} className={`card ${review.is_hidden ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} size={12} className={s <= review.rating ? "text-accent fill-accent" : "text-text-secondary"} />
                      ))}
                    </div>
                    <span className="text-[10px] text-text-secondary">
                      {review.is_anonymous ? "Anoniem" : review.customer?.full_name || "Onbekend"}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mb-1">
                    Kapper: {review.barber?.full_name || "—"} · {format(new Date(review.created_at), "d MMM yyyy", { locale: nl })}
                  </p>
                  {review.comment && <p className="text-sm text-text-primary">{review.comment}</p>}
                  {review.barber_reply && <p className="text-xs text-accent mt-1">↪ {review.barber_reply}</p>}
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full ${review.is_hidden ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
                  {review.is_hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
