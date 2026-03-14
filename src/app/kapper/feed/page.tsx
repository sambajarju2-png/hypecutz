"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Trash2, Image as ImageIcon, X, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface MyPost {
  id: string;
  image_url: string | null;
  caption: string | null;
  post_type: string;
  is_published: boolean;
  created_at: string;
}

type PostMode = "photo" | "announcement";

export default function BarberFeedPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [postMode, setPostMode] = useState<PostMode>("photo");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("feed_posts")
      .select("*")
      .eq("barber_id", profile.id)
      .order("created_at", { ascending: false });
    setPosts((data as MyPost[]) || []);
    setLoading(false);
  }, [profile?.id, supabase]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handlePost() {
    if (!profile?.id) return;
    if (postMode === "photo" && !file) return;
    if (postMode === "announcement" && !caption.trim()) return;

    setUploading(true);
    setError(null);

    let imageUrl: string | null = null;

    if (postMode === "photo" && file) {
      const ext = file.name.split(".").pop();
      const path = `feed/${profile.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("barber-photos").upload(path, file);
      if (uploadErr) { setError("Upload mislukt: " + uploadErr.message); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("barber-photos").getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    const { error: insertErr } = await supabase.from("feed_posts").insert({
      barber_id: profile.id,
      image_url: imageUrl,
      caption: caption.trim() || null,
      post_type: postMode,
      is_published: true,
    });

    if (insertErr) { setError("Post aanmaken mislukt"); setUploading(false); return; }

    setShowForm(false);
    setFile(null);
    setPreview(null);
    setCaption("");
    setUploading(false);
    fetchPosts();
  }

  async function deletePost(id: string) {
    await supabase.from("feed_posts").delete().eq("id", id);
    fetchPosts();
  }

  function closeForm() {
    setShowForm(false);
    setFile(null);
    setPreview(null);
    setCaption("");
    setError(null);
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
        <h1 className="text-xl font-bold text-text-primary">Mijn Feed</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-2 bg-accent text-background rounded-button text-sm font-medium">
            <Plus size={14} /> Nieuwe post
          </button>
        )}
      </div>

      {/* New post form */}
      {showForm && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-text-primary">Nieuwe post</h2>
            <button onClick={closeForm}><X size={16} className="text-text-secondary" /></button>
          </div>

          {/* Post type toggle */}
          <div className="flex gap-2">
            <button onClick={() => setPostMode("photo")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-button text-sm font-medium transition-colors ${
                postMode === "photo" ? "bg-accent text-background" : "bg-background-elevated text-text-secondary"
              }`}>
              <ImageIcon size={14} /> Foto
            </button>
            <button onClick={() => setPostMode("announcement")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-button text-sm font-medium transition-colors ${
                postMode === "announcement" ? "bg-accent text-background" : "bg-background-elevated text-text-secondary"
              }`}>
              <Megaphone size={14} /> Mededeling
            </button>
          </div>

          {error && <p className="text-danger text-xs">{error}</p>}

          {/* Photo upload (only for photo mode) */}
          {postMode === "photo" && (
            preview ? (
              <div className="aspect-square rounded-input overflow-hidden bg-background-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-video rounded-input bg-background-elevated border-2 border-dashed border-border cursor-pointer hover:border-accent/50 transition-colors">
                <ImageIcon size={32} className="text-text-secondary mb-2" />
                <span className="text-sm text-text-secondary">Kies een foto</span>
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </label>
            )
          )}

          {/* Caption / message */}
          <textarea
            placeholder={postMode === "announcement" ? "Schrijf je mededeling... (bijv. sluiting, last minute plekken)" : "Beschrijving (optioneel)"}
            className="input-field !h-24 py-3 resize-none"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          <button onClick={handlePost} disabled={(postMode === "photo" && !file) || (postMode === "announcement" && !caption.trim()) || uploading} className="btn-primary">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : "Plaatsen"}
          </button>
        </div>
      )}

      {/* Posts list */}
      {posts.length === 0 && !showForm ? (
        <div className="card text-center py-8">
          <ImageIcon size={32} className="text-text-secondary mx-auto mb-2" />
          <p className="text-text-secondary text-sm">Nog geen posts. Deel je werk of plaats een mededeling!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className={`card !p-0 overflow-hidden relative group ${post.post_type === "announcement" ? "border-accent/20" : ""}`}>
              {post.post_type === "photo" && post.image_url && (
                <div className="aspect-square bg-background-elevated overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-3">
                {post.post_type === "announcement" && (
                  <div className="flex items-center gap-1 mb-1">
                    <Megaphone size={12} className="text-accent" />
                    <span className="text-[10px] text-accent font-medium">Mededeling</span>
                  </div>
                )}
                <p className="text-sm text-text-primary">{post.caption || "Geen beschrijving"}</p>
                <p className="text-[10px] text-text-secondary mt-1">
                  {format(new Date(post.created_at), "d MMM yyyy, HH:mm", { locale: nl })}
                </p>
              </div>
              <button onClick={() => deletePost(post.id)}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={12} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
