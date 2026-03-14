"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Calendar, Image, MessageCircle, Settings } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const NAV_ITEMS = [
  { href: "/kapper/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/kapper/agenda", label: "Agenda", icon: Calendar },
  { href: "/kapper/feed", label: "Feed", icon: Image },
  { href: "/kapper/chats", label: "Chats", icon: MessageCircle },
  { href: "/kapper/instellingen", label: "Meer", icon: Settings },
] as const;

export default function BarberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useAuth();

  const isOnboarding = pathname === "/kapper/onboarding";

  // Redirect incomplete barbers to onboarding (Section 7.1)
  useEffect(() => {
    if (!loading && profile && profile.role === "barber" && !profile.is_active && !isOnboarding) {
      router.replace("/kapper/onboarding");
    }
  }, [loading, profile, isOnboarding, router]);

  // Show loading while checking profile
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <main className={`flex-1 ${isOnboarding ? "" : "pb-20"}`}>
        {children}
      </main>

      {/* Hide bottom nav during onboarding */}
      {!isOnboarding && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background-card border-t border-border">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-1 px-3 py-2"
                >
                  <Icon
                    size={22}
                    className={
                      isActive ? "text-accent" : "text-text-secondary"
                    }
                  />
                  <span
                    className={`text-[10px] font-medium ${
                      isActive ? "text-accent" : "text-text-secondary"
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
