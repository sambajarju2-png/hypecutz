"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface FeedPost {
  id: string;
  image_url: string;
  caption: string | null;
  is_published: boolean;
  created_at: string;
  barber: { full_name: string } | null;
}

export default function AdminFeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("feed_posts")
      .select("id, image_url, caption, is_published, created_at, barber:profiles!feed_posts_barber_id_fkey(full_name)")
      .order("created_at", { ascending: false });
    setPosts((data as unknown as FeedPost[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Feed</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-accent" />
        </div>
      ) : posts.length === 0 ? (
        <div className="card text-center">
          <p className="text-text-secondary text-sm">Nog geen feed posts. Kappers kunnen posts aanmaken in Phase 10.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {posts.map((post) => (
            <div key={post.id} className={`card ${!post.is_published ? "opacity-50" : ""}`}>
              <div className="aspect-square bg-background-elevated rounded-input mb-2 overflow-hidden">
                <Image src={post.image_url} alt="" width={400} height={400} className="w-full h-full object-cover" unoptimized />
              </div>
              <p className="text-sm text-text-primary">{post.caption || "Geen beschrijving"}</p>
              <p className="text-[10px] text-text-secondary mt-1">
                {post.barber?.full_name || "—"} · {format(new Date(post.created_at), "d MMM yyyy", { locale: nl })}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] px-2 py-1 rounded-full ${post.is_published ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                  {post.is_published ? "Gepubliceerd" : "Verborgen"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
