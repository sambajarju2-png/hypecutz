import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Geen toegang" }, { status: 403 });

    const admin = createAdminSupabaseClient();
    const { data } = await admin
      .from("credit_packages")
      .select("id, total_amount_cents, remaining_amount_cents, expires_at, created_at, customer:profiles!credit_packages_customer_id_fkey(full_name)")
      .order("created_at", { ascending: false });

    return NextResponse.json({ packages: data || [] });
  } catch (error) {
    console.error("Admin credits error:", error);
    return NextResponse.json({ error: "Interne serverfout" }, { status: 500 });
  }
}
