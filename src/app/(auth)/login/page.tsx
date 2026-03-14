"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register" | "forgot";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Onjuist e-mailadres of wachtwoord."
          : authError.message
      );
      setLoading(false);
      return;
    }

    // Fetch role to determine redirect
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Kan gebruiker niet ophalen.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    if (redirectTo) {
      router.push(redirectTo);
    } else if (role === "admin") {
      router.push("/admin/dashboard");
    } else if (role === "barber") {
      router.push("/kapper/dashboard");
    } else {
      router.push("/home");
    }

    router.refresh();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("Wachtwoord moet minimaal 6 tekens zijn.");
      setLoading(false);
      return;
    }

    if (!fullName.trim()) {
      setError("Vul je naam in.");
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role: "customer",
        },
      },
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        setError("Dit e-mailadres is al geregistreerd.");
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    // Auto-login after registration (Supabase auto-confirms by default)
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      // If email confirmation is required
      setError(
        "Account aangemaakt! Controleer je e-mail om je account te bevestigen."
      );
      setMode("login");
      setLoading(false);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetSent(false);

    if (!email.trim()) {
      setError("Vul je e-mailadres in.");
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/login`,
      }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setResetSent(true);
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Logo */}
      <Image
        src="/logo.svg"
        alt="Hypecutz"
        width={200}
        height={60}
        priority
      />

      <form
        onSubmit={mode === "login" ? handleLogin : mode === "register" ? handleRegister : handleForgotPassword}
        className="w-full space-y-4"
      >
        <h1 className="text-2xl font-bold text-text-primary text-center">
          {mode === "login" ? "Inloggen" : mode === "register" ? "Account aanmaken" : "Wachtwoord vergeten"}
        </h1>
        <p className="text-text-secondary text-center text-sm">
          {mode === "login"
            ? "Welkom bij Hypecutz. Log in om verder te gaan."
            : mode === "register"
            ? "Maak een account aan om afspraken te boeken."
            : "Vul je e-mailadres in om een resetlink te ontvangen."}
        </p>

        {/* Error message */}
        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-input px-4 py-3 text-danger text-sm">
            {error}
          </div>
        )}

        {/* Reset sent success */}
        {resetSent && (
          <div className="bg-success/10 border border-success/30 rounded-input px-4 py-3 text-success text-sm">
            Resetlink verstuurd! Controleer je e-mail.
          </div>
        )}

        <div className="space-y-3">
          {/* Full name — only on register */}
          {mode === "register" && (
            <input
              type="text"
              placeholder="Volledige naam"
              className="input-field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          )}

          <input
            type="email"
            placeholder="E-mailadres"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          {mode !== "forgot" && (
            <input
              type="password"
              placeholder="Wachtwoord"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
            />
          )}

          {/* Forgot password link — only on login */}
          {mode === "login" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(null); setResetSent(false); }}
                className="text-accent text-xs hover:underline"
              >
                Wachtwoord vergeten?
              </button>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : mode === "login" ? (
              "Inloggen"
            ) : mode === "register" ? (
              "Account aanmaken"
            ) : (
              "Verstuur resetlink"
            )}
          </button>
        </div>

        <p className="text-text-secondary text-center text-xs">
          {mode === "login" ? (
            <>
              Nog geen account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className="text-accent hover:underline"
              >
                Registreren
              </button>
            </>
          ) : (
            <>
              Terug naar{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setResetSent(false);
                }}
                className="text-accent hover:underline"
              >
                Inloggen
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
