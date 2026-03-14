import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMollieClient } from "@/lib/mollie";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PaymentSchema = z.object({
  appointment_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const body = await request.json();
    const parsed = PaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Fetch appointment with service price
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id, status, payment_method, payment_status, service:services(price_cents, name), barber:profiles!appointments_barber_id_fkey(full_name)")
      .eq("id", parsed.data.appointment_id)
      .eq("customer_id", user.id)
      .single();

    if (!appointment) {
      return NextResponse.json({ error: "Afspraak niet gevonden" }, { status: 404 });
    }

    if (appointment.payment_status === "paid") {
      return NextResponse.json({ error: "Afspraak is al betaald" }, { status: 400 });
    }

    const service = appointment.service as unknown as { price_cents: number; name: string } | null;
    if (!service) {
      return NextResponse.json({ error: "Service niet gevonden" }, { status: 404 });
    }

    const barber = appointment.barber as unknown as { full_name: string } | null;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create Mollie payment
    const mollie = getMollieClient();
    const payment = await mollie.payments.create({
      amount: {
        currency: "EUR",
        value: (service.price_cents / 100).toFixed(2),
      },
      description: `Hypecutz — ${service.name} bij ${barber?.full_name || "kapper"}`,
      redirectUrl: `${appUrl}/afspraken?payment=success`,
      webhookUrl: `${appUrl}/api/webhooks/mollie`,
      metadata: {
        appointment_id: appointment.id,
        type: "appointment",
      },
    });

    // Store Mollie payment ID on appointment
    await supabase
      .from("appointments")
      .update({ mollie_payment_id: payment.id })
      .eq("id", appointment.id);

    return NextResponse.json({
      checkout_url: payment.getCheckoutUrl(),
      payment_id: payment.id,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    const message = error instanceof Error ? error.message : "Betaling aanmaken mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
