import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getMollieClient } from "@/lib/mollie";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const paymentId = formData.get("id") as string;

    if (!paymentId) {
      return NextResponse.json({ error: "Missing payment ID" }, { status: 400 });
    }

    // Verify payment status with Mollie — never trust frontend
    const mollie = getMollieClient();
    const payment = await mollie.payments.get(paymentId);
    const metadata = payment.metadata as { appointment_id?: string; type?: string; package_customer_id?: string; package_amount_cents?: number };

    const admin = createAdminSupabaseClient();

    if (metadata.type === "appointment" && metadata.appointment_id) {
      // Appointment payment
      if (payment.status === "paid") {
        await admin
          .from("appointments")
          .update({
            payment_status: "paid",
            status: "confirmed",
          })
          .eq("id", metadata.appointment_id);

        // Create chat channel for newly confirmed appointment
        const { data: existingChannel } = await admin
          .from("chat_channels")
          .select("id")
          .eq("appointment_id", metadata.appointment_id)
          .single();

        if (!existingChannel) {
          await admin.from("chat_channels").insert({
            appointment_id: metadata.appointment_id,
            status: "active",
          });
        }

        // Trigger confirmation notification (fire-and-forget)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        fetch(`${appUrl}/api/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "appointment_confirmed", appointment_id: metadata.appointment_id }),
        }).catch((e) => console.error("Notification error:", e));

        fetch(`${appUrl}/api/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "new_booking", appointment_id: metadata.appointment_id }),
        }).catch((e) => console.error("Barber notification error:", e));
      } else if (payment.status === "failed" || payment.status === "expired" || payment.status === "canceled") {
        await admin
          .from("appointments")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("id", metadata.appointment_id)
          .eq("status", "pending");
      }
    } else if (metadata.type === "credit_package" && metadata.package_customer_id) {
      // Credit package purchase
      if (payment.status === "paid") {
        await admin.from("credit_packages").insert({
          customer_id: metadata.package_customer_id,
          mollie_payment_id: paymentId,
          total_amount_cents: metadata.package_amount_cents || 0,
          remaining_amount_cents: metadata.package_amount_cents || 0,
        });
      }
    }

    // Mollie expects 200 OK
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Mollie webhook error:", error);
    // Still return 200 to prevent Mollie from retrying endlessly
    return new NextResponse("OK", { status: 200 });
  }
}
