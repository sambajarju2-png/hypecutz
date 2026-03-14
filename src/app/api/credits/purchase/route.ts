import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMollieClient } from "@/lib/mollie";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PurchaseSchema = z.object({
  amount_cents: z.number().min(100, "Minimum €1"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const body = await request.json();
    const parsed = PurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { amount_cents } = parsed.data;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const mollie = getMollieClient();
    const payment = await mollie.payments.create({
      amount: {
        currency: "EUR",
        value: (amount_cents / 100).toFixed(2),
      },
      description: `Hypecutz — Creditpakket €${(amount_cents / 100).toFixed(2)}`,
      redirectUrl: `${appUrl}/profiel?credits=success`,
      webhookUrl: `${appUrl}/api/webhooks/mollie`,
      metadata: {
        type: "credit_package",
        package_customer_id: user.id,
        package_amount_cents: amount_cents,
      },
    });

    return NextResponse.json({
      checkout_url: payment.getCheckoutUrl(),
      payment_id: payment.id,
    });
  } catch (error) {
    console.error("Credit purchase error:", error);
    const message = error instanceof Error ? error.message : "Aankoop mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
