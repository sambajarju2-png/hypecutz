"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Loader2, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

interface FeedPost {
  id: string;
  image_url: string | null;
  caption: string | null;
  post_type: "photo" | "announcement";
  created_at: string;
  barber: { id: string; full_name: string; avatar_url: string | null } | null;
  reactions: { emoji: string; user_id: string }[];
}

const QUICK_EMOJIS = ["🔥", "💈", "💪", "👏", "❤️"];

export default function CustomerHomePage() {
  const { profile, signOut, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    const { data } = await supabase
      .from("feed_posts")
      .select(`
        id, image_url, caption, post_type, created_at,
        barber:profiles!feed_posts_barber_id_fkey(id, full_name, avatar_url),
        reactions:feed_reactions(emoji, user_id)
      `)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(30);

    setPosts((data as unknown as FeedPost[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  async function toggleReaction(postId: string, emoji: string) {
    if (!profile?.id) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const existing = post.reactions.find((r) => r.user_id === profile.id && r.emoji === emoji);

    // Optimistic update — update UI immediately, no page refresh
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        if (existing) {
          return { ...p, reactions: p.reactions.filter((r) => !(r.user_id === profile!.id && r.emoji === emoji)) };
        } else {
          return { ...p, reactions: [...p.reactions, { emoji, user_id: profile!.id }] };
        }
      })
    );

    // Fire DB update in background
    if (existing) {
      await supabase.from("feed_reactions").delete()
        .eq("post_id", postId).eq("user_id", profile.id).eq("emoji", emoji);
    } else {
      await supabase.from("feed_reactions").insert({ post_id: postId, user_id: profile.id, emoji });
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary text-sm">Welkom terug,</p>
          <h1 className="text-xl font-bold text-text-primary">{profile?.full_name || "Klant"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Logo size="sm" showSubtitle={false} />
          <button onClick={signOut} className="p-2 rounded-button hover:bg-background-elevated transition-colors" aria-label="Uitloggen">
            <LogOut size={20} className="text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Quick book CTA */}
      <Link href="/boeken" className="btn-primary block text-center">
        Boek een afspraak
      </Link>

      {/* Feed */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-text-primary">Feed</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-accent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="card">
            <p className="text-text-secondary text-sm text-center">Nog geen posts. Kom later terug!</p>
          </div>
        ) : (
          posts.map((post) => {
            const reactionCounts: Record<string, { count: number; mine: boolean }> = {};
            for (const r of post.reactions) {
              if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = { count: 0, mine: false };
              reactionCounts[r.emoji].count++;
              if (r.user_id === profile?.id) reactionCounts[r.emoji].mine = true;
            }

            // Announcement post
            if (post.post_type === "announcement") {
              return (
                <div key={post.id} className="card border-accent/30 bg-accent/5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Megaphone size={14} className="text-accent" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-accent">{post.barber?.full_name}</span>
                        <span className="text-[10px] text-text-secondary">
                          {format(new Date(post.created_at), "d MMM", { locale: nl })}
                        </span>
                      </div>
                      <p className="text-sm text-text-primary leading-relaxed">{post.caption}</p>
                    </div>
                  </div>
                  {/* Emoji reactions */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-3 pl-11">
                    {QUICK_EMOJIS.map((emoji) => {
                      const data = reactionCounts[emoji];
                      return (
                        <button key={emoji} onClick={() => toggleReaction(post.id, emoji)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                            data?.mine ? "bg-accent/20 border border-accent/40" : "bg-background-elevated hover:bg-background-elevated/80"
                          }`}>
                          <span>{emoji}</span>
                          {data && data.count > 0 && <span className="text-text-secondary">{data.count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Photo post
            return (
              <div key={post.id} className="card !p-0 overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <Link href={`/barber/${post.barber?.id}`} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-background-elevated overflow-hidden flex items-center justify-center">
                      {post.barber?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.barber.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-accent">{post.barber?.full_name?.[0] || "?"}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{post.barber?.full_name}</p>
                      <p className="text-[10px] text-text-secondary">{format(new Date(post.created_at), "d MMM yyyy", { locale: nl })}</p>
                    </div>
                  </Link>
                </div>

                {post.image_url && (
                  <div className="aspect-square bg-background-elevated">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="p-3 space-y-2">
                  {post.caption && <p className="text-sm text-text-primary">{post.caption}</p>}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {QUICK_EMOJIS.map((emoji) => {
                      const data = reactionCounts[emoji];
                      return (
                        <button key={emoji} onClick={() => toggleReaction(post.id, emoji)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                            data?.mine ? "bg-accent/20 border border-accent/40" : "bg-background-elevated hover:bg-background-elevated/80"
                          }`}>
                          <span>{emoji}</span>
                          {data && data.count > 0 && <span className="text-text-secondary">{data.count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
