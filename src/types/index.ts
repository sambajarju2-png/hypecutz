// User roles
export type UserRole = "customer" | "barber" | "admin";

// Appointment statuses
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

// Payment methods
export type PaymentMethod = "prepay" | "instore" | "credits";

// Payment statuses
export type PaymentStatus = "unpaid" | "paid" | "refunded";

// Chat channel statuses
export type ChatChannelStatus = "active" | "readonly" | "closed";

// Profile (extends Supabase auth.users)
export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_active: boolean;
  no_show_count: number;
  payment_pref_prepay: boolean;
  payment_pref_instore: boolean;
  payment_pref_credits: boolean;
  created_at: string;
}

// Service (behandeling)
export interface Service {
  id: string;
  barber_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  buffer_after_minutes: number;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
}

// Barber schedule (recurring weekly)
export interface BarberSchedule {
  id: string;
  barber_id: string;
  day_of_week: number; // 0=Sun, 1=Mon ... 6=Sat
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  is_working: boolean;
}

// Barber block (one-off: vacation, sick day)
export interface BarberBlock {
  id: string;
  barber_id: string;
  blocked_date: string; // YYYY-MM-DD
  start_time: string | null; // null = full day
  end_time: string | null; // null = full day
  reason: string | null;
}

// Appointment
export interface Appointment {
  id: string;
  customer_id: string;
  barber_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  mollie_payment_id: string | null;
  cancelled_at: string | null;
  cancellation_window_hours: number;
  notes: string | null;
  created_at: string;
}

// Credit package
export interface CreditPackage {
  id: string;
  customer_id: string;
  mollie_payment_id: string;
  total_amount_cents: number;
  remaining_amount_cents: number;
  expires_at: string;
  created_at: string;
}

// Credit redemption
export interface CreditRedemption {
  id: string;
  package_id: string;
  appointment_id: string;
  amount_cents: number;
  redeemed_at: string;
}

// Credit redemption code (OTP for in-store scanning)
export interface CreditRedemptionCode {
  id: string;
  appointment_id: string;
  code: string;
  expires_at: string;
  used_at: string | null;
}

// Chat channel
export interface ChatChannel {
  id: string;
  appointment_id: string;
  status: ChatChannelStatus;
  closed_at: string | null;
}

// Chat message
export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

// Barber photo
export interface BarberPhoto {
  id: string;
  barber_id: string;
  storage_path: string;
  caption: string | null;
  is_approved: boolean;
  is_before_after: boolean;
  created_at: string;
}

// Review
export interface Review {
  id: string;
  appointment_id: string;
  customer_id: string | null;
  barber_id: string;
  rating: number; // 1-5
  comment: string | null;
  barber_reply: string | null;
  is_anonymous: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

// Feed post
export interface FeedPost {
  id: string;
  barber_id: string;
  image_url: string;
  caption: string | null;
  is_published: boolean;
  created_at: string;
}

// Feed reaction (emoji only)
export interface FeedReaction {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

// Waitlist entry
export interface WaitlistEntry {
  id: string;
  customer_id: string;
  barber_id: string;
  service_id: string;
  requested_date: string; // YYYY-MM-DD
  notified_at: string | null;
  created_at: string;
}

// Booking wizard context state
export interface BookingState {
  barberId: string | null;
  serviceId: string | null;
  date: string | null; // YYYY-MM-DD
  timeSlot: string | null; // HH:mm
  paymentMethod: PaymentMethod | null;
}

// Helper: format cents to euro string
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
