import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// POST: Generate redemption code (barber calls this)
// PUT: Validate and redeem code (customer or barber confirms)

const GenerateSchema = z.object({
  appointment_id: z.string().uuid(),
});

const RedeemSchema = z.object({
  appointment_id: z.string().uuid(),
  code: z.string().min(4).max(6),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const body = await request.json();
    const parsed = GenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Verify the caller is the barber for this appointment
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id, barber_id, customer_id, payment_method, service:services(price_cents)")
      .eq("id", parsed.data.appointment_id)
      .single();

    if (!appointment) {
      return NextResponse.json({ error: "Afspraak niet gevonden" }, { status: 404 });
    }

    if (appointment.barber_id !== user.id) {
      return NextResponse.json({ error: "Alleen de kapper kan een code genereren" }, { status: 403 });
    }

    if (appointment.payment_method !== "credits") {
      return NextResponse.json({ error: "Deze afspraak gebruikt geen credits" }, { status: 400 });
    }

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    const admin = createAdminSupabaseClient();
    await admin.from("credit_redemption_codes").insert({
      appointment_id: appointment.id,
      code,
      expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes
    });

    return NextResponse.json({ code, expires_in_seconds: 120 });
  } catch (error) {
    console.error("Generate code error:", error);
    return NextResponse.json({ error: "Code genereren mislukt" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const body = await request.json();
    const parsed = RedeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    // Find valid, unused code
    const { data: codeRecord } = await admin
      .from("credit_redemption_codes")
      .select("*")
      .eq("appointment_id", parsed.data.appointment_id)
      .eq("code", parsed.data.code)
      .is("used_at", null)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (!codeRecord) {
      return NextResponse.json({ error: "Ongeldige of verlopen code" }, { status: 400 });
    }

    // Get appointment + service price
    const { data: appointment } = await admin
      .from("appointments")
      .select("id, customer_id, service:services(price_cents)")
      .eq("id", parsed.data.appointment_id)
      .single();

    if (!appointment) {
      return NextResponse.json({ error: "Afspraak niet gevonden" }, { status: 404 });
    }

    const service = appointment.service as unknown as { price_cents: number } | null;
    const price = service?.price_cents || 0;

    // Find customer's active credit package with sufficient balance
    const { data: packages } = await admin
      .from("credit_packages")
      .select("*")
      .eq("customer_id", appointment.customer_id)
      .gt("remaining_amount_cents", 0)
      .gte("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: true }); // Use earliest expiring first

    if (!packages || packages.length === 0) {
      return NextResponse.json({ error: "Geen actief creditpakket gevonden" }, { status: 400 });
    }

    // Deduct from packages (may span multiple if needed)
    let remaining = price;
    const deductions: { package_id: string; amount: number }[] = [];

    for (const pkg of packages) {
      if (remaining <= 0) break;
      const deduct = Math.min(remaining, pkg.remaining_amount_cents);
      deductions.push({ package_id: pkg.id, amount: deduct });
      remaining -= deduct;
    }

    if (remaining > 0) {
      return NextResponse.json({
        error: "Onvoldoende tegoed",
        deficit_cents: remaining,
      }, { status: 400 });
    }

    // Apply deductions
    for (const d of deductions) {
      const pkg = packages.find((p) => p.id === d.package_id)!;
      await admin
        .from("credit_packages")
        .update({ remaining_amount_cents: pkg.remaining_amount_cents - d.amount })
        .eq("id", d.package_id);

      await admin.from("credit_redemptions").insert({
        package_id: d.package_id,
        appointment_id: appointment.id,
        amount_cents: d.amount,
      });
    }

    // Mark code as used
    await admin
      .from("credit_redemption_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", codeRecord.id);

    // Update appointment payment status
    await admin
      .from("appointments")
      .update({ payment_status: "paid" })
      .eq("id", appointment.id);

    return NextResponse.json({
      success: true,
      deducted_cents: price,
    });
  } catch (error) {
    console.error("Redeem credits error:", error);
    return NextResponse.json({ error: "Verzilveren mislukt" }, { status: 500 });
  }
}
