import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const InviteSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  full_name: z.string().min(1, "Naam is verplicht"),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the caller is an admin
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Niet ingelogd" },
        { status: 401 }
      );
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "Alleen admin kan kappers uitnodigen" },
        { status: 403 }
      );
    }

    // 2. Validate input
    const body = await request.json();
    const parsed = InviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, full_name } = parsed.data;

    // 3. Create barber account using admin (service role) client
    const adminClient = createAdminSupabaseClient();

    // Generate a temporary password (barber will change on first login)
    const tempPassword = `Hype_${Math.random().toString(36).slice(2, 10)}!`;

    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Skip email verification for invited barbers
        user_metadata: {
          full_name,
          role: "barber",
        },
      });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "Dit e-mailadres is al geregistreerd" },
          { status: 409 }
        );
      }
      console.error("Error creating barber:", createError);
      return NextResponse.json(
        { error: "Kan kapper niet aanmaken" },
        { status: 500 }
      );
    }

    // 4. The handle_new_user trigger auto-creates the profile row.
    //    But update the role to 'barber' explicitly to be safe, and set is_active=false
    //    until they complete their profile.
    if (newUser.user) {
      await adminClient
        .from("profiles")
        .update({
          role: "barber",
          full_name,
          is_active: false, // Barber completes onboarding before going active
        })
        .eq("id", newUser.user.id);

      // Create default schedule (Mon-Sat working, Sun off)
      const defaultSchedule = Array.from({ length: 7 }, (_, day) => ({
        barber_id: newUser.user!.id,
        day_of_week: day,
        start_time: "10:00:00",
        end_time: "18:00:00",
        is_working: day !== 0, // Sunday off
      }));

      await adminClient.from("barber_schedules").insert(defaultSchedule);
    }

    // 5. Return success with temp credentials
    // NOTE: In Phase 8, this will also send an invite email via Resend
    return NextResponse.json({
      success: true,
      barber_id: newUser.user?.id,
      email,
      temp_password: tempPassword,
      message: `Kapper ${full_name} is uitgenodigd. Tijdelijk wachtwoord: ${tempPassword}. Resend email wordt gekoppeld in Phase 8.`,
    });
  } catch (error) {
    console.error("Invite barber error:", error);
    return NextResponse.json(
      { error: "Interne serverfout" },
      { status: 500 }
    );
  }
}
