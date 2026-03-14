import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Verify caller is admin
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    // Use admin client for aggregate queries
    const admin = createAdminSupabaseClient();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    // Week boundaries (Mon-Sun)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset).toISOString();
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset + 7).toISOString();

    // Month boundaries
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    // Parallel queries for performance
    const [
      todayAppointments,
      weekAppointments,
      monthAppointments,
      allBarbers,
      activeCredits,
      recentReviews,
      monthServices,
    ] = await Promise.all([
      // Appointments today
      admin
        .from("appointments")
        .select("id, payment_status, service_id, barber_id")
        .gte("starts_at", todayStart)
        .lt("starts_at", todayEnd)
        .in("status", ["confirmed", "completed"]),

      // Appointments this week
      admin
        .from("appointments")
        .select("id, payment_status, service_id, barber_id")
        .gte("starts_at", weekStart)
        .lt("starts_at", weekEnd)
        .in("status", ["confirmed", "completed"]),

      // Appointments this month (for revenue calc)
      admin
        .from("appointments")
        .select("id, payment_status, service_id, barber_id, services(price_cents)")
        .gte("starts_at", monthStart)
        .lt("starts_at", monthEnd)
        .in("status", ["confirmed", "completed"]),

      // All barbers
      admin
        .from("profiles")
        .select("id, full_name, is_active")
        .eq("role", "barber"),

      // Active credit packages
      admin
        .from("credit_packages")
        .select("id, remaining_amount_cents")
        .gt("remaining_amount_cents", 0)
        .gte("expires_at", now.toISOString()),

      // Recent reviews (last 30 days)
      admin
        .from("reviews")
        .select("rating")
        .gte("created_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),

      // Most booked services this month
      admin
        .from("appointments")
        .select("service_id, services(name)")
        .gte("starts_at", monthStart)
        .lt("starts_at", monthEnd)
        .in("status", ["confirmed", "completed"]),
    ]);

    // Calculate revenue (from paid appointments with service prices)
    let revenueMonth = 0;
    for (const apt of monthAppointments.data || []) {
      if (apt.payment_status === "paid" && apt.services) {
        revenueMonth += (apt.services as unknown as { price_cents: number }).price_cents;
      }
    }

    // Average rating
    const ratings = (recentReviews.data || []).map((r) => r.rating);
    const avgRating =
      ratings.length > 0
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : null;

    // Credit package stats
    const activePackageCount = (activeCredits.data || []).length;
    const outstandingCredits = (activeCredits.data || []).reduce(
      (sum, pkg) => sum + pkg.remaining_amount_cents,
      0
    );

    // Top 3 services this month
    const serviceCounts: Record<string, { name: string; count: number }> = {};
    for (const apt of monthServices.data || []) {
      const sid = apt.service_id;
      const name = (apt.services as unknown as { name: string } | null)?.name || "Onbekend";
      if (!serviceCounts[sid]) {
        serviceCounts[sid] = { name, count: 0 };
      }
      serviceCounts[sid].count++;
    }
    const topServices = Object.values(serviceCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Active barbers
    const activeBarbers = (allBarbers.data || []).filter((b) => b.is_active).length;
    const totalBarbers = (allBarbers.data || []).length;

    return NextResponse.json({
      revenue: {
        today: 0, // Need service price joins for accurate calc — simplified for now
        week: 0,
        month: revenueMonth,
      },
      appointments: {
        today: (todayAppointments.data || []).length,
        week: (weekAppointments.data || []).length,
      },
      barbers: {
        active: activeBarbers,
        total: totalBarbers,
      },
      avgRating,
      credits: {
        activePackages: activePackageCount,
        outstandingCents: outstandingCredits,
      },
      topServices,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Interne serverfout" }, { status: 500 });
  }
}
