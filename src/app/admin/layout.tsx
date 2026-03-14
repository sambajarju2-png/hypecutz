"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import {
  LayoutDashboard,
  CalendarDays,
  XCircle,
  Scissors,
  Star,
  Image,
  CreditCard,
  Settings,
  Menu,
  X,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/afspraken", label: "Afspraken", icon: CalendarDays },
  { href: "/admin/annuleringen", label: "Annuleringen & No-Shows", icon: XCircle },
  { href: "/admin/barbers", label: "Kappers", icon: Scissors },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/feed", label: "Feed", icon: Image },
  { href: "/admin/credits", label: "Credits", icon: CreditCard },
  { href: "/admin/instellingen", label: "Instellingen", icon: Settings },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-background-card border-r border-border
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <Logo size="sm" showSubtitle={false} />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-text-secondary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-3">
          {SIDEBAR_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-background-elevated"
                  }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="flex items-center h-16 px-4 border-b border-border lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-text-secondary"
          >
            <Menu size={24} />
          </button>
          <div className="ml-4"><Logo size="sm" showSubtitle={false} /></div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
