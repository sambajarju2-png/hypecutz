import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  barber_id: z.string().uuid(),
  service_id: z.string().uuid(),
  starts_at: z.string(), // ISO datetime
  payment_method: z.enum(["prepay", "instore", "credits"]),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { barber_id, service_id, starts_at, payment_method, notes } = parsed.data;

    // Fetch service to get duration + buffer
    const { data: service } = await supabase
      .from("services")
      .select("duration_minutes, buffer_after_minutes, price_cents")
      .eq("id", service_id)
      .single();

    if (!service) {
      return NextResponse.json({ error: "Behandeling niet gevonden" }, { status: 404 });
    }

    // Calculate ends_at
    const startsAtDate = new Date(starts_at);
    const totalMinutes = service.duration_minutes + service.buffer_after_minutes;
    const endsAt = new Date(startsAtDate.getTime() + totalMinutes * 60 * 1000).toISOString();

    // Check for overlapping appointments (Business Rule: NEVER allowed)
    const { data: conflicts } = await supabase
      .from("appointments")
      .select("id")
      .eq("barber_id", barber_id)
      .in("status", ["pending", "confirmed"])
      .lt("starts_at", endsAt)
      .gt("ends_at", starts_at);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: "Dit tijdslot is niet meer beschikbaar" }, { status: 409 });
    }

    // Determine initial status based on payment method
    const status = payment_method === "prepay" ? "pending" : "confirmed";
    const paymentStatus = "unpaid";

    // Create appointment
    const { data: appointment, error: insertError } = await supabase
      .from("appointments")
      .insert({
        customer_id: user.id,
        barber_id,
        service_id,
        starts_at,
        ends_at: endsAt,
        status,
        payment_method,
        payment_status: paymentStatus,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Create appointment error:", insertError);
      return NextResponse.json({ error: "Kan afspraak niet aanmaken" }, { status: 500 });
    }

    // Create chat channel for confirmed appointments
    if (status === "confirmed" && appointment) {
      await supabase.from("chat_channels").insert({
        appointment_id: appointment.id,
        status: "active",
      });
    }

    return NextResponse.json({
      success: true,
      appointment_id: appointment?.id,
      status,
      // For prepay: frontend would redirect to Mollie (Phase 7)
      requires_payment: payment_method === "prepay",
    });
  } catch (error) {
    console.error("Appointment creation error:", error);
    return NextResponse.json({ error: "Interne serverfout" }, { status: 500 });
  }
}
