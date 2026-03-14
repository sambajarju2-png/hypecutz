"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function BarberOnboardingPage() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [prepay, setPrepay] = useState(false);
  const [instore, setInstore] = useState(true);
  const [credits, setCredits] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!fullName.trim()) {
      setError("Vul je naam in.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        payment_pref_prepay: prepay,
        payment_pref_instore: instore,
        payment_pref_credits: credits,
        is_active: true,
      })
      .eq("id", profile?.id);

    if (updateError) {
      console.error("Onboarding error:", updateError);
      setError("Kan profiel niet opslaan. Probeer het opnieuw.");
      setLoading(false);
      return;
    }

    await refreshProfile();
    router.push("/kapper/dashboard");
    router.refresh();
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-text-primary">
          Welkom bij Hypecutz
        </h1>
        <p className="text-text-secondary text-sm mt-2">
          Rond je profiel af zodat klanten je kunnen boeken.
        </p>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-input px-4 py-3 text-danger text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Naam *
          </label>
          <input
            type="text"
            className="input-field"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Je volledige naam"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Telefoon
          </label>
          <input
            type="tel"
            className="input-field"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+31 6 12345678"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Bio
          </label>
          <textarea
            className="input-field !h-24 py-3 resize-none"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Vertel iets over jezelf en je specialiteiten..."
          />
        </div>

        {/* Payment preferences */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">
            Betaalmethoden
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 card cursor-pointer">
              <input
                type="checkbox"
                checked={prepay}
                onChange={(e) => setPrepay(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <div>
                <p className="text-sm text-text-primary">Online betalen</p>
                <p className="text-xs text-text-secondary">
                  Klant betaalt vooraf via iDEAL / Apple Pay
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 card cursor-pointer">
              <input
                type="checkbox"
                checked={instore}
                onChange={(e) => setInstore(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <div>
                <p className="text-sm text-text-primary">Betalen in de winkel</p>
                <p className="text-xs text-text-secondary">
                  Klant betaalt contant of pin bij aankomst
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 card cursor-pointer">
              <input
                type="checkbox"
                checked={credits}
                onChange={(e) => setCredits(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <div>
                <p className="text-sm text-text-primary">Credits accepteren</p>
                <p className="text-xs text-text-secondary">
                  Klant kan betalen met tegoed uit een creditpakket
                </p>
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            "Profiel opslaan"
          )}
        </button>
      </form>
    </div>
  );
}
