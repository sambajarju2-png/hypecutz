"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, CalendarDays, MessageCircle, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/boeken", label: "Boeken", icon: CalendarDays },
  { href: "/afspraken", label: "Afspraken", icon: MessageCircle },
  { href: "/profiel", label: "Profiel", icon: User },
] as const;

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* Main content area — padded for bottom nav */}
      <main className="flex-1 pb-20">{children}</main>

      {/* Fixed bottom navigation */}
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
    </div>
  );
}
