"use client";

import { useEffect, useState, useCallback } from "react";
import { useBooking } from "./BookingContext";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addDays,
  startOfWeek,
  addWeeks,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";
import { nl } from "date-fns/locale";

interface Slot {
  time: string;
  available: boolean;
}

export default function StepDateTime() {
  const { state, setDate, setTimeSlot } = useBooking();
  const [weekOffset, setWeekOffset] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsReason, setSlotsReason] = useState<string | null>(null);

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const selectedDate = state.date ? new Date(state.date + "T00:00:00") : null;

  const fetchSlots = useCallback(
    async (dateStr: string) => {
      if (!state.barber || !state.service) return;
      setLoadingSlots(true);
      setSlotsReason(null);

      const params = new URLSearchParams({
        barber_id: state.barber.id,
        date: dateStr,
        duration: state.service.duration_minutes.toString(),
        buffer: state.service.buffer_after_minutes.toString(),
      });

      try {
        const res = await fetch(`/api/slots?${params}`);
        const data = await res.json();
        setSlots(data.slots || []);
        setSlotsReason(data.reason || null);
      } catch {
        setSlotsReason("Kan beschikbaarheid niet laden");
      }
      setLoadingSlots(false);
    },
    [state.barber, state.service]
  );

  useEffect(() => {
    if (state.date) {
      fetchSlots(state.date);
    }
  }, [state.date, fetchSlots]);

  function handleSelectDate(date: Date) {
    const dateStr = format(date, "yyyy-MM-dd");
    setDate(dateStr);
  }

  const isPastDay = (d: Date) => isBefore(d, today);

  return (
    <div className="space-y-5">
      {/* Week navigator */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
            className="p-2 rounded-button hover:bg-background-elevated transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={18} className="text-text-secondary" />
          </button>
          <p className="text-sm font-medium text-text-primary">
            {format(weekStart, "MMMM yyyy", { locale: nl })}
          </p>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="p-2 rounded-button hover:bg-background-elevated transition-colors"
          >
            <ChevronRight size={18} className="text-text-secondary" />
          </button>
        </div>

        {/* Day buttons */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const past = isPastDay(day);
            const selected = selectedDate && isSameDay(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                onClick={() => !past && handleSelectDate(day)}
                disabled={past}
                className={`flex flex-col items-center py-2 rounded-button text-xs transition-colors ${
                  selected
                    ? "bg-accent text-background"
                    : past
                    ? "opacity-30 cursor-not-allowed"
                    : "hover:bg-background-elevated text-text-primary"
                }`}
              >
                <span className="text-[10px] uppercase">
                  {format(day, "EEE", { locale: nl })}
                </span>
                <span className="text-sm font-medium mt-0.5">
                  {format(day, "d")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {state.date && (
        <div>
          <p className="text-sm font-medium text-text-secondary mb-3">
            Beschikbare tijden op{" "}
            <span className="text-text-primary">
              {selectedDate && format(selectedDate, "EEEE d MMMM", { locale: nl })}
            </span>
          </p>

          {loadingSlots ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-accent" />
            </div>
          ) : slotsReason ? (
            <div className="card text-center">
              <p className="text-text-secondary text-sm">{slotsReason}</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="card text-center">
              <p className="text-text-secondary text-sm">Geen tijdsloten beschikbaar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && setTimeSlot(slot.time)}
                  disabled={!slot.available}
                  className={`py-2.5 rounded-button text-sm font-medium transition-colors ${
                    state.timeSlot === slot.time
                      ? "bg-accent text-background"
                      : slot.available
                      ? "bg-background-elevated text-text-primary hover:bg-accent/20 hover:text-accent"
                      : "bg-background-elevated/50 text-text-secondary/40 cursor-not-allowed line-through"
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
