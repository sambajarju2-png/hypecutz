import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin")
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

    const admin = createAdminSupabaseClient();
    const { searchParams } = new URL(request.url);

    let query = admin
      .from("appointments")
      .select(`
        id, starts_at, ends_at, status, payment_method, payment_status, cancelled_at, created_at,
        customer:profiles!appointments_customer_id_fkey(id, full_name),
        barber:profiles!appointments_barber_id_fkey(id, full_name),
        service:services(name, price_cents)
      `)
      .order("starts_at", { ascending: false })
      .limit(100);

    const status = searchParams.get("status");
    if (status) query = query.eq("status", status);

    const barberId = searchParams.get("barber_id");
    if (barberId) query = query.eq("barber_id", barberId);

    const dateFrom = searchParams.get("date_from");
    if (dateFrom) query = query.gte("starts_at", dateFrom);

    const dateTo = searchParams.get("date_to");
    if (dateTo) query = query.lte("starts_at", dateTo);

    const { data, error } = await query;

    if (error) {
      console.error("Admin appointments query error:", error);
      return NextResponse.json({ error: "Query mislukt" }, { status: 500 });
    }

    return NextResponse.json({ appointments: data || [] });
  } catch (error) {
    console.error("Admin appointments error:", error);
    return NextResponse.json({ error: "Interne serverfout" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin")
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

    const body = await request.json();
    const { appointment_id, status } = body;

    if (!appointment_id || !["no_show", "completed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const update: Record<string, string> = { status };
    if (status === "cancelled") {
      update.cancelled_at = new Date().toISOString();
    }

    const { error } = await admin
      .from("appointments")
      .update(update)
      .eq("id", appointment_id);

    if (error) {
      console.error("Update appointment error:", error);
      return NextResponse.json({ error: "Update mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin appointment patch error:", error);
    return NextResponse.json({ error: "Interne serverfout" }, { status: 500 });
  }
}
