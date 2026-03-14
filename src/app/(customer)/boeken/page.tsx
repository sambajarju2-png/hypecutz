"use client";

import { BookingProvider, useBooking } from "@/components/booking/BookingContext";
import StepBarber from "@/components/booking/StepBarber";
import StepService from "@/components/booking/StepService";
import StepDateTime from "@/components/booking/StepDateTime";
import StepPayment from "@/components/booking/StepPayment";
import { ChevronLeft } from "lucide-react";

const STEP_TITLES = ["", "Kies je kapper", "Kies je behandeling", "Kies datum en tijd", "Betaling"];

function BookingWizard() {
  const { state, setStep } = useBooking();
  const { step } = state;

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header with back + step title */}
      <div className="flex items-center gap-3">
        {step > 1 && (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-button hover:bg-background-elevated transition-colors"
          >
            <ChevronLeft size={20} className="text-text-secondary" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-bold text-text-primary">
            {STEP_TITLES[step]}
          </h1>
          <p className="text-[10px] text-text-secondary">
            Stap {step} van 4
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-accent" : "bg-background-elevated"
            }`}
          />
        ))}
      </div>

      {/* Step context info */}
      {step >= 2 && state.barber && (
        <div className="flex items-center gap-2 px-3 py-2 bg-background-card rounded-input border border-border">
          <span className="text-[10px] text-text-secondary">Kapper:</span>
          <span className="text-xs text-text-primary font-medium">{state.barber.full_name}</span>
          {step >= 3 && state.service && (
            <>
              <span className="text-text-secondary">·</span>
              <span className="text-xs text-text-primary font-medium">{state.service.name}</span>
            </>
          )}
        </div>
      )}

      {/* Step content */}
      {step === 1 && <StepBarber />}
      {step === 2 && <StepService />}
      {step === 3 && <StepDateTime />}
      {step === 4 && <StepPayment />}
    </div>
  );
}

export default function BookingPage() {
  return (
    <BookingProvider>
      <BookingWizard />
    </BookingProvider>
  );
}
