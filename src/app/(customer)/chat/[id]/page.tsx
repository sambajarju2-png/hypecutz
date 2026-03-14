"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Send, ArrowLeft, Lock } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface ChannelInfo {
  id: string;
  status: string;
  appointment: {
    barber: { full_name: string } | null;
    customer: { full_name: string } | null;
  } | null;
}

export default function ChatPage({ params }: { params: { id: string } }) {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const appointmentId = params.id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch channel info
    const { data: ch } = await supabase
      .from("chat_channels")
      .select(`
        id, status,
        appointment:appointments!chat_channels_appointment_id_fkey(
          barber:profiles!appointments_barber_id_fkey(full_name),
          customer:profiles!appointments_customer_id_fkey(full_name)
        )
      `)
      .eq("appointment_id", appointmentId)
      .single();

    if (ch) {
      setChannel(ch as unknown as ChannelInfo);

      // Fetch messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("channel_id", ch.id)
        .order("created_at", { ascending: true });

      setMessages((msgs as Message[]) || []);
    }
    setLoading(false);
  }, [appointmentId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!channel?.id) return;

    const subscription = supabase
      .channel(`chat-${channel.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channel?.id, supabase]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !channel || !user || sending) return;
    if (channel.status !== "active") return;

    setSending(true);
    await supabase.from("messages").insert({
      channel_id: channel.id,
      sender_id: user.id,
      body: newMessage.trim(),
    });
    setNewMessage("");
    setSending(false);
  }

  // Determine other person's name
  const otherName = profile?.role === "barber"
    ? (channel?.appointment as unknown as { customer: { full_name: string } | null })?.customer?.full_name
    : (channel?.appointment as unknown as { barber: { full_name: string } | null })?.barber?.full_name;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="p-4">
        <div className="card text-center">
          <p className="text-text-secondary text-sm">Chat niet gevonden.</p>
          <Link href="/afspraken" className="text-accent text-sm mt-2 inline-block">
            ← Terug naar afspraken
          </Link>
        </div>
      </div>
    );
  }

  const isClosed = channel.status !== "active";

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background-card">
        <Link href="/afspraken" className="p-1">
          <ArrowLeft size={20} className="text-text-secondary" />
        </Link>
        <div>
          <p className="text-sm font-medium text-text-primary">{otherName || "Chat"}</p>
          <p className="text-[10px] text-text-secondary">
            {isClosed ? "Chat gesloten" : "Actief"}
          </p>
        </div>
      </div>

      {/* Closed banner */}
      {isClosed && (
        <div className="flex items-center gap-2 px-4 py-2 bg-background-elevated border-b border-border">
          <Lock size={12} className="text-text-secondary" />
          <p className="text-xs text-text-secondary">
            Chat gesloten — je kunt geen berichten meer sturen.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-text-secondary text-sm text-center py-8">
            Geen berichten. Stuur het eerste bericht!
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-card ${
                    isMine
                      ? "bg-accent text-background rounded-br-sm"
                      : "bg-background-elevated text-text-primary rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm break-words">{msg.body}</p>
                  <p className={`text-[9px] mt-1 ${isMine ? "text-background/60" : "text-text-secondary"}`}>
                    {format(new Date(msg.created_at), "HH:mm")}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isClosed && (
        <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-border bg-background-card">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Typ een bericht..."
            className="input-field !h-10 text-sm flex-1"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 bg-accent rounded-button flex items-center justify-center disabled:opacity-50 transition-opacity"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin text-background" />
            ) : (
              <Send size={16} className="text-background" />
            )}
          </button>
        </form>
      )}
    </div>
  );
}
