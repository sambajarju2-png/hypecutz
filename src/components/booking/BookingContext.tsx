"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { Profile, Service, PaymentMethod } from "@/types";

export interface BookingState {
  step: number;
  barber: Profile | null;
  service: Service | null;
  date: string | null; // YYYY-MM-DD
  timeSlot: string | null; // HH:mm
  paymentMethod: PaymentMethod | null;
}

interface BookingContextType {
  state: BookingState;
  setBarber: (barber: Profile) => void;
  setService: (service: Service) => void;
  setDate: (date: string) => void;
  setTimeSlot: (slot: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setStep: (step: number) => void;
  reset: () => void;
}

const INITIAL_STATE: BookingState = {
  step: 1,
  barber: null,
  service: null,
  date: null,
  timeSlot: null,
  paymentMethod: null,
};

const BookingContext = createContext<BookingContextType | null>(null);

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) throw new Error("useBooking must be used within BookingProvider");
  return context;
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BookingState>(INITIAL_STATE);

  const setBarber = useCallback((barber: Profile) => {
    setState((prev) => ({ ...prev, barber, step: 2 }));
  }, []);

  const setService = useCallback((service: Service) => {
    setState((prev) => ({ ...prev, service, step: 3 }));
  }, []);

  const setDate = useCallback((date: string) => {
    setState((prev) => ({ ...prev, date, timeSlot: null }));
  }, []);

  const setTimeSlot = useCallback((slot: string) => {
    setState((prev) => ({ ...prev, timeSlot: slot, step: 4 }));
  }, []);

  const setPaymentMethod = useCallback((method: PaymentMethod) => {
    setState((prev) => ({ ...prev, paymentMethod: method }));
  }, []);

  const setStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return (
    <BookingContext.Provider
      value={{ state, setBarber, setService, setDate, setTimeSlot, setPaymentMethod, setStep, reset }}
    >
      {children}
    </BookingContext.Provider>
  );
}
