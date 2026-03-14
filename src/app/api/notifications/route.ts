import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { sendAppointmentConfirmation, sendAppointmentReminder, sendAppointmentCancelled, type AppointmentEmailData } from "@/lib/resend";
import { pushAppointmentConfirmed, pushAppointmentReminder, pushAppointmentCancelled, pushNewBookingToBarber, pushNewReview } from "@/lib/onesignal";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TriggerSchema = z.object({
  event: z.enum([
    "appointment_confirmed",
    "appointment_reminder",
    "appointment_cancelled",
    "appointment_rescheduled",
    "new_booking",
    "new_review",
  ]),
  appointment_id: z.string().uuid().optional(),
  review_id: z.string().uuid().optional(),
});

function formatCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = TriggerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { event, appointment_id, review_id } = parsed.data;
    const admin = createAdminSupabaseClient();

    if (appointment_id && [
      "appointment_confirmed",
      "appointment_reminder",
      "appointment_cancelled",
      "appointment_rescheduled",
      "new_booking",
    ].includes(event)) {
      // Fetch appointment details
      const { data: apt } = await admin
        .from("appointments")
        .select(`
          id, starts_at, ends_at, barber_id, customer_id,
          customer:profiles!appointments_customer_id_fkey(full_name, phone),
          barber:profiles!appointments_barber_id_fkey(full_name),
          service:services(name, price_cents)
        `)
        .eq("id", appointment_id)
        .single();

      if (!apt) {
        return NextResponse.json({ error: "Afspraak niet gevonden" }, { status: 404 });
      }

      const customer = apt.customer as unknown as { full_name: string; phone: string | null } | null;
      const barber = apt.barber as unknown as { full_name: string } | null;
      const service = apt.service as unknown as { name: string; price_cents: number } | null;

      // Get customer email from auth.users
      const { data: customerAuth } = await admin.auth.admin.getUserById(apt.customer_id);
      const customerEmail = customerAuth?.user?.email;

      const dateTimeStr = format(new Date(apt.starts_at), "EEEE d MMMM yyyy 'om' HH:mm", { locale: nl });

      const emailData: AppointmentEmailData = {
        customerName: customer?.full_name || "Klant",
        customerEmail: customerEmail || "",
        barberName: barber?.full_name || "Kapper",
        serviceName: service?.name || "Behandeling",
        dateTime: dateTimeStr,
        price: service ? formatCents(service.price_cents) : "€0",
      };

      const results: string[] = [];

      switch (event) {
        case "appointment_confirmed":
          if (customerEmail) {
            await sendAppointmentConfirmation(emailData).catch((e) => console.error("Email error:", e));
            results.push("email_sent");
          }
          await pushAppointmentConfirmed(apt.customer_id, emailData.barberName, dateTimeStr).catch((e) => console.error("Push error:", e));
          results.push("push_sent");
          break;

        case "appointment_reminder":
          if (customerEmail) {
            await sendAppointmentReminder(emailData).catch((e) => console.error("Email error:", e));
            results.push("email_sent");
          }
          await pushAppointmentReminder(apt.customer_id, emailData.barberName, dateTimeStr).catch((e) => console.error("Push error:", e));
          results.push("push_sent");
          break;

        case "appointment_cancelled":
          if (customerEmail) {
            await sendAppointmentCancelled(emailData).catch((e) => console.error("Email error:", e));
            results.push("email_sent");
          }
          await pushAppointmentCancelled(apt.customer_id, emailData.barberName).catch((e) => console.error("Push error:", e));
          results.push("push_sent");
          break;

        case "new_booking":
          await pushNewBookingToBarber(
            apt.barber_id,
            customer?.full_name || "Klant",
            dateTimeStr
          ).catch((e) => console.error("Push error:", e));
          results.push("barber_push_sent");
          break;
      }

      return NextResponse.json({ success: true, results });
    }

    if (event === "new_review" && review_id) {
      const { data: review } = await admin
        .from("reviews")
        .select("rating, barber_id")
        .eq("id", review_id)
        .single();

      if (review) {
        await pushNewReview(review.barber_id, review.rating).catch((e) => console.error("Push error:", e));
      }

      return NextResponse.json({ success: true, results: ["review_push_sent"] });
    }

    return NextResponse.json({ error: "Ongeldige event/data combinatie" }, { status: 400 });
  } catch (error) {
    console.error("Notification trigger error:", error);
    return NextResponse.json({ error: "Interne serverfout" }, { status: 500 });
  }
}
