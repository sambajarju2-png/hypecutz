import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get("barber_id");
    const date = searchParams.get("date"); // YYYY-MM-DD
    const durationMin = parseInt(searchParams.get("duration") || "30");
    const bufferMin = parseInt(searchParams.get("buffer") || "0");

    if (!barberId || !date) {
      return NextResponse.json({ error: "barber_id en date zijn verplicht" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = dateObj.getDay(); // 0=Sun

    // 1. Get barber schedule for this day
    const { data: schedule } = await supabase
      .from("barber_schedules")
      .select("*")
      .eq("barber_id", barberId)
      .eq("day_of_week", dayOfWeek)
      .single();

    if (!schedule || !schedule.is_working) {
      return NextResponse.json({ slots: [], reason: "Kapper werkt niet op deze dag" });
    }

    // 2. Check for blocks on this date
    const { data: blocks } = await supabase
      .from("barber_blocks")
      .select("*")
      .eq("barber_id", barberId)
      .eq("blocked_date", date);

    // Full day block
    const fullDayBlock = (blocks || []).find((b) => !b.start_time && !b.end_time);
    if (fullDayBlock) {
      return NextResponse.json({ slots: [], reason: "Kapper is niet beschikbaar op deze datum" });
    }

    // 3. Get existing confirmed appointments for this barber on this date
    const dayStart = date + "T00:00:00Z";
    const dayEnd = date + "T23:59:59Z";

    const { data: existingAppts } = await supabase
      .from("appointments")
      .select("starts_at, ends_at")
      .eq("barber_id", barberId)
      .gte("starts_at", dayStart)
      .lte("starts_at", dayEnd)
      .in("status", ["pending", "confirmed"]);

    // 4. Generate all possible 30-min slots within schedule
    const [startH, startM] = schedule.start_time.split(":").map(Number);
    const [endH, endM] = schedule.end_time.split(":").map(Number);
    const scheduleStartMin = startH * 60 + startM;
    const scheduleEndMin = endH * 60 + endM;
    const totalSlotMin = durationMin + bufferMin;

    const slots: { time: string; available: boolean }[] = [];
    const now = new Date();

    for (let mins = scheduleStartMin; mins + totalSlotMin <= scheduleEndMin; mins += 30) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

      // Create slot datetime for comparison
      const slotStart = new Date(`${date}T${timeStr}:00`);
      const slotEnd = new Date(slotStart.getTime() + totalSlotMin * 60 * 1000);

      // Check if slot is in the past (with 2h cancellation window for same-day)
      const isPast = slotStart.getTime() <= now.getTime();

      // Check overlap with existing appointments
      const hasConflict = (existingAppts || []).some((apt) => {
        const aptStart = new Date(apt.starts_at).getTime();
        const aptEnd = new Date(apt.ends_at).getTime();
        return slotStart.getTime() < aptEnd && slotEnd.getTime() > aptStart;
      });

      // Check overlap with partial blocks
      const isBlocked = (blocks || []).some((b) => {
        if (!b.start_time || !b.end_time) return false;
        const [bsH, bsM] = b.start_time.split(":").map(Number);
        const [beH, beM] = b.end_time.split(":").map(Number);
        const blockStart = bsH * 60 + bsM;
        const blockEnd = beH * 60 + beM;
        return mins < blockEnd && (mins + totalSlotMin) > blockStart;
      });

      slots.push({
        time: timeStr,
        available: !isPast && !hasConflict && !isBlocked,
      });
    }

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Slots error:", error);
    return NextResponse.json({ error: "Interne serverfout" }, { status: 500 });
  }
}
