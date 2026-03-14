"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Detect iOS
    const ua = navigator.userAgent.toLowerCase();
    const isiOS = /iphone|ipad|ipod/.test(ua);
    setIsIos(isiOS);

    if (isiOS) {
      // iOS doesn't fire beforeinstallprompt, show manual guide
      setShowBanner(true);
      return;
    }

    // Android / desktop Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    setShowIosGuide(false);
    try {
      localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    } catch {
      // localStorage might not be available
    }
  }

  if (!showBanner) return null;

  return (
    <>
      {/* Install banner */}
      <div className="fixed bottom-20 left-4 right-4 z-40 bg-background-card border border-accent/30 rounded-card p-4 shadow-lg shadow-black/40 max-w-lg mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-button flex items-center justify-center flex-shrink-0">
            <Download size={18} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary">
              Installeer Hypecutz
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              Voeg de app toe aan je startscherm voor snellere toegang.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 flex-shrink-0"
          >
            <X size={16} className="text-text-secondary" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstall}
            className="flex-1 py-2 bg-accent text-background rounded-button text-sm font-medium"
          >
            Installeren
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-text-secondary text-sm"
          >
            Later
          </button>
        </div>
      </div>

      {/* iOS install guide modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={handleDismiss} />
          <div className="relative bg-background-card border border-border rounded-card p-5 max-w-sm w-full mb-4 space-y-4">
            <h3 className="text-base font-bold text-text-primary text-center">
              Installeer Hypecutz op iPhone
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 bg-accent/10 rounded-full flex items-center justify-center text-accent text-sm font-bold">1</span>
                <p className="text-sm text-text-primary">
                  Tik op het <strong>Deel</strong>-icoon (vierkantje met pijl omhoog)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 bg-accent/10 rounded-full flex items-center justify-center text-accent text-sm font-bold">2</span>
                <p className="text-sm text-text-primary">
                  Scroll naar beneden en tik op <strong>&quot;Zet op beginscherm&quot;</strong>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 bg-accent/10 rounded-full flex items-center justify-center text-accent text-sm font-bold">3</span>
                <p className="text-sm text-text-primary">
                  Tik op <strong>&quot;Voeg toe&quot;</strong>
                </p>
              </div>
            </div>
            <button onClick={handleDismiss} className="btn-primary">
              Begrepen
            </button>
          </div>
        </div>
      )}
    </>
  );
}
