"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save, Camera } from "lucide-react";

export default function BarberProfileEditPage() {
  const { profile, refreshProfile, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
      })
      .eq("id", profile?.id);

    if (updateError) {
      setError("Kan profiel niet opslaan");
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${profile.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("barber-photos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("Upload mislukt: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("barber-photos").getPublicUrl(path);

    await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", profile.id);

    await refreshProfile();
    setUploading(false);
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-text-primary">Mijn Profiel</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-background-elevated border-2 border-border overflow-hidden flex items-center justify-center">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-accent">
                {profile?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
              </span>
            )}
          </div>
          <label className="absolute bottom-0 right-0 w-8 h-8 bg-accent rounded-full flex items-center justify-center cursor-pointer">
            {uploading ? (
              <Loader2 size={14} className="animate-spin text-background" />
            ) : (
              <Camera size={14} className="text-background" />
            )}
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </label>
        </div>
        <p className="text-[10px] text-text-secondary">Tik op het camera-icoon om je foto te wijzigen</p>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-input px-4 py-3 text-danger text-sm">{error}</div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs text-text-secondary mb-1">Naam *</label>
          <input type="text" className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">Telefoon</label>
          <input type="tel" className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+31 6 12345678" />
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">Bio</label>
          <textarea className="input-field !h-24 py-3 resize-none" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Vertel iets over jezelf..." />
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Profiel opslaan</>}
        </button>
        {saved && <p className="text-success text-sm text-center">Opgeslagen!</p>}
      </form>
    </div>
  );
}
