import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const JoinSchema = z.object({
  barber_id: z.string().uuid(),
  service_id: z.string().uuid(),
  requested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const body = await request.json();
    const parsed = JoinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Check if already on waitlist for this barber + date
    const { data: existing } = await supabase
      .from("waitlist")
      .select("id")
      .eq("customer_id", user.id)
      .eq("barber_id", parsed.data.barber_id)
      .eq("requested_date", parsed.data.requested_date)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Je staat al op de wachtlijst voor deze datum" }, { status: 409 });
    }

    const { error: insertError } = await supabase.from("waitlist").insert({
      customer_id: user.id,
      barber_id: parsed.data.barber_id,
      service_id: parsed.data.service_id,
      requested_date: parsed.data.requested_date,
    });

    if (insertError) {
      console.error("Waitlist insert error:", insertError);
      return NextResponse.json({ error: "Kan niet toevoegen aan wachtlijst" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Je staat op de wachtlijst! We sturen een bericht als er een plek vrijkomt." });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json({ error: "Interne serverfout" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID verplicht" }, { status: 400 });

    await supabase.from("waitlist").delete().eq("id", id).eq("customer_id", user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Waitlist delete error:", error);
    return NextResponse.json({ error: "Interne serverfout" }, { status: 500 });
  }
}
