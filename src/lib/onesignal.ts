const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "";
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY || "";
const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";

interface PushPayload {
  headings: string;
  contents: string;
  url?: string;
  externalUserIds: string[]; // Supabase user IDs
}

export async function sendPush(payload: PushPayload): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    console.warn("OneSignal not configured, skipping push notification");
    return false;
  }

  if (payload.externalUserIds.length === 0) return false;

  try {
    const res = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: {
          external_id: payload.externalUserIds,
        },
        target_channel: "push",
        headings: { en: payload.headings, nl: payload.headings },
        contents: { en: payload.contents, nl: payload.contents },
        url: payload.url,
        chrome_web_badge: "/icons/icon-192x192.png",
        chrome_web_icon: "/icons/icon-192x192.png",
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("OneSignal push error:", res.status, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("OneSignal push failed:", error);
    return false;
  }
}

// Pre-built notification senders for each event

export async function pushAppointmentConfirmed(
  customerId: string,
  barberName: string,
  dateTime: string
) {
  return sendPush({
    headings: "Afspraak bevestigd ✂️",
    contents: `Je afspraak met ${barberName} op ${dateTime} is bevestigd.`,
    url: "/afspraken",
    externalUserIds: [customerId],
  });
}

export async function pushAppointmentReminder(
  customerId: string,
  barberName: string,
  dateTime: string
) {
  return sendPush({
    headings: "Herinnering 💈",
    contents: `Vergeet je afspraak niet! ${barberName} om ${dateTime}.`,
    url: "/afspraken",
    externalUserIds: [customerId],
  });
}

export async function pushAppointmentCancelled(
  customerId: string,
  barberName: string
) {
  return sendPush({
    headings: "Afspraak geannuleerd",
    contents: `Je afspraak met ${barberName} is geannuleerd.`,
    url: "/boeken",
    externalUserIds: [customerId],
  });
}

export async function pushAppointmentRescheduled(
  customerId: string,
  barberName: string,
  newDateTime: string
) {
  return sendPush({
    headings: "Afspraak verplaatst",
    contents: `Je afspraak met ${barberName} is verplaatst naar ${newDateTime}.`,
    url: "/afspraken",
    externalUserIds: [customerId],
  });
}

export async function pushNewBookingToBarber(
  barberId: string,
  customerName: string,
  dateTime: string
) {
  return sendPush({
    headings: "Nieuwe boeking 📅",
    contents: `${customerName} heeft geboekt op ${dateTime}.`,
    url: "/kapper/dashboard",
    externalUserIds: [barberId],
  });
}

export async function pushNewChatMessage(
  recipientId: string,
  senderName: string
) {
  return sendPush({
    headings: "Nieuw bericht 💬",
    contents: `${senderName} heeft je een bericht gestuurd.`,
    url: "/kapper/chats",
    externalUserIds: [recipientId],
  });
}

export async function pushWaitlistSpotOpened(
  customerIds: string[],
  barberName: string,
  date: string
) {
  return sendPush({
    headings: "Plek vrijgekomen! 🎯",
    contents: `Er is een plek vrijgekomen bij ${barberName} op ${date}. Boek snel!`,
    url: "/boeken",
    externalUserIds: customerIds,
  });
}

export async function pushNewReview(
  barberId: string,
  rating: number
) {
  return sendPush({
    headings: "Nieuwe beoordeling ⭐",
    contents: `Je hebt een ${rating}-sterren beoordeling ontvangen.`,
    url: "/kapper/dashboard",
    externalUserIds: [barberId],
  });
}
