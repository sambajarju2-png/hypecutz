"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Loader2, MessageCircle, Lock } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import Link from "next/link";

interface ChatThread {
  id: string;
  appointment_id: string;
  status: string;
  appointment: {
    starts_at: string;
    customer: { full_name: string } | null;
    service: { name: string } | null;
  } | null;
  lastMessage?: { body: string; created_at: string } | null;
}

export default function BarberChatsPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchThreads = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);

    // Get all chat channels for this barber's appointments
    const { data: channels } = await supabase
      .from("chat_channels")
      .select(`
        id, appointment_id, status,
        appointment:appointments!chat_channels_appointment_id_fkey(
          starts_at, barber_id,
          customer:profiles!appointments_customer_id_fkey(full_name),
          service:services(name)
        )
      `)
      .order("appointment_id", { ascending: false });

    // Filter to only this barber's channels
    const myChannels = ((channels as unknown as ChatThread[]) || []).filter((ch) => {
      const apt = ch.appointment as unknown as { barber_id: string } | null;
      return apt && (apt as { barber_id: string }).barber_id === profile.id;
    });

    // Fetch last message for each channel
    const withMessages = await Promise.all(
      myChannels.map(async (ch) => {
        const { data: msgs } = await supabase
          .from("messages")
          .select("body, created_at")
          .eq("channel_id", ch.id)
          .order("created_at", { ascending: false })
          .limit(1);

        return { ...ch, lastMessage: msgs?.[0] || null };
      })
    );

    setThreads(withMessages);
    setLoading(false);
  }, [profile?.id, supabase]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Chats</h1>

      {threads.length === 0 ? (
        <div className="card text-center py-8">
          <MessageCircle size={32} className="text-text-secondary mx-auto mb-2" />
          <p className="text-text-secondary text-sm">
            Nog geen chats. Chats worden aangemaakt wanneer een klant boekt.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => {
            const apt = thread.appointment;
            const isClosed = thread.status !== "active";
            return (
              <Link
                key={thread.id}
                href={`/chat/${thread.appointment_id}`}
                className={`card flex items-center gap-3 hover:border-accent/50 transition-colors ${isClosed ? "opacity-60" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-background-elevated flex items-center justify-center flex-shrink-0">
                  {isClosed ? (
                    <Lock size={16} className="text-text-secondary" />
                  ) : (
                    <MessageCircle size={16} className="text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {apt?.customer?.full_name || "Klant"}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    {thread.lastMessage
                      ? thread.lastMessage.body
                      : apt?.service?.name || "Geen berichten"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-text-secondary">
                    {thread.lastMessage
                      ? format(new Date(thread.lastMessage.created_at), "HH:mm")
                      : apt?.starts_at
                      ? format(new Date(apt.starts_at), "d MMM", { locale: nl })
                      : ""}
                  </p>
                  {isClosed && (
                    <span className="text-[9px] text-text-secondary">Gesloten</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
