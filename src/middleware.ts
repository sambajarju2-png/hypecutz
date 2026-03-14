import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/register"];

// Role → default redirect after login
const ROLE_REDIRECTS: Record<string, string> = {
  customer: "/home",
  barber: "/kapper/dashboard",
  admin: "/admin/dashboard",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });

  const supabase = createMiddlewareSupabaseClient(request, response);

  // Refresh the auth session (important for token rotation)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow public routes
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Allow API routes and static files
  const isApiOrStatic =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico";

  if (isApiOrStatic) {
    return response;
  }

  // Not logged in → redirect to login (unless already on a public route)
  if (!user) {
    if (isPublicRoute || pathname === "/") {
      return response;
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is logged in — fetch their role from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as string | undefined;

  // If logged in user visits login page or root, redirect to their dashboard
  if (isPublicRoute || pathname === "/") {
    if (role && ROLE_REDIRECTS[role]) {
      return NextResponse.redirect(
        new URL(ROLE_REDIRECTS[role], request.url)
      );
    }
    return response;
  }

  // No profile → sign out and redirect to login
  if (!role) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based route protection
  // Admin routes: /admin/*
  // Barber routes: /kapper/*
  // Customer routes: everything else (top-level: /home, /boeken, etc.)
  const isAdminRoute = pathname.startsWith("/admin");
  const isBarberRoute = pathname.startsWith("/kapper");

  if (isAdminRoute && role !== "admin") {
    return NextResponse.redirect(
      new URL(ROLE_REDIRECTS[role], request.url)
    );
  }

  if (isBarberRoute && role !== "barber") {
    return NextResponse.redirect(
      new URL(ROLE_REDIRECTS[role], request.url)
    );
  }

  // Customer routes — only customers can access top-level app routes
  if (!isAdminRoute && !isBarberRoute && role !== "customer") {
    return NextResponse.redirect(
      new URL(ROLE_REDIRECTS[role], request.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)",
  ],
};
