import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not configured");
    resendClient = new Resend(key);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@hypecutz.nl";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://hypecutz.nl";

function baseTemplate(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0F0F0F;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="color:#C9A84C;font-size:24px;font-weight:700;">HYPECUTZ</span>
    </div>
    <div style="background-color:#1A1A1A;border-radius:12px;padding:24px;border:1px solid #333333;">
      <h1 style="color:#F5F5F5;font-size:18px;margin:0 0 16px 0;">${title}</h1>
      ${body}
    </div>
    <p style="color:#888888;font-size:11px;text-align:center;margin-top:24px;">
      Hypecutz — Schiedamseweg 28A, 3025 AB Rotterdam
    </p>
  </div>
</body>
</html>`;
}

function p(text: string): string {
  return `<p style="color:#F5F5F5;font-size:14px;line-height:1.6;margin:0 0 12px 0;">${text}</p>`;
}

function detail(label: string, value: string): string {
  return `<p style="color:#888888;font-size:13px;margin:4px 0;"><strong style="color:#F5F5F5;">${label}:</strong> ${value}</p>`;
}

function ctaButton(text: string, url: string): string {
  return `<div style="text-align:center;margin-top:20px;">
    <a href="${url}" style="display:inline-block;background:#C9A84C;color:#0F0F0F;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${text}</a>
  </div>`;
}

export interface AppointmentEmailData {
  customerName: string;
  customerEmail: string;
  barberName: string;
  serviceName: string;
  dateTime: string; // formatted Dutch string
  price: string; // e.g. "€25,00"
}

export async function sendAppointmentConfirmation(data: AppointmentEmailData) {
  const resend = getResend();
  const html = baseTemplate(
    "Afspraak bevestigd ✂️",
    p(`Hoi ${data.customerName},`) +
    p("Je afspraak bij Hypecutz is bevestigd!") +
    detail("Kapper", data.barberName) +
    detail("Behandeling", data.serviceName) +
    detail("Datum & tijd", data.dateTime) +
    detail("Prijs", data.price) +
    ctaButton("Bekijk afspraak", `${APP_URL}/afspraken`)
  );

  return resend.emails.send({
    from: `Hypecutz <${FROM_EMAIL}>`,
    to: data.customerEmail,
    subject: `Afspraak bevestigd — ${data.serviceName} bij ${data.barberName}`,
    html,
  });
}

export async function sendAppointmentReminder(data: AppointmentEmailData) {
  const resend = getResend();
  const html = baseTemplate(
    "Herinnering: morgen je afspraak 💈",
    p(`Hoi ${data.customerName},`) +
    p("Vergeet je afspraak morgen niet!") +
    detail("Kapper", data.barberName) +
    detail("Behandeling", data.serviceName) +
    detail("Datum & tijd", data.dateTime) +
    p("Tot dan bij Hypecutz!") +
    ctaButton("Bekijk afspraak", `${APP_URL}/afspraken`)
  );

  return resend.emails.send({
    from: `Hypecutz <${FROM_EMAIL}>`,
    to: data.customerEmail,
    subject: `Herinnering: ${data.serviceName} morgen bij ${data.barberName}`,
    html,
  });
}

export async function sendAppointmentCancelled(data: AppointmentEmailData & { reason?: string }) {
  const resend = getResend();
  const html = baseTemplate(
    "Afspraak geannuleerd",
    p(`Hoi ${data.customerName},`) +
    p("Helaas is je afspraak geannuleerd.") +
    detail("Kapper", data.barberName) +
    detail("Behandeling", data.serviceName) +
    detail("Datum & tijd", data.dateTime) +
    (data.reason ? p(`Reden: ${data.reason}`) : "") +
    p("Je kunt een nieuwe afspraak maken via de app.") +
    ctaButton("Nieuwe afspraak boeken", `${APP_URL}/boeken`)
  );

  return resend.emails.send({
    from: `Hypecutz <${FROM_EMAIL}>`,
    to: data.customerEmail,
    subject: "Je afspraak bij Hypecutz is geannuleerd",
    html,
  });
}

export async function sendAppointmentRescheduled(data: AppointmentEmailData & { newDateTime: string }) {
  const resend = getResend();
  const html = baseTemplate(
    "Afspraak verplaatst",
    p(`Hoi ${data.customerName},`) +
    p("Je afspraak is verplaatst naar een nieuw tijdstip.") +
    detail("Kapper", data.barberName) +
    detail("Behandeling", data.serviceName) +
    detail("Nieuw tijdstip", data.newDateTime) +
    ctaButton("Bekijk afspraak", `${APP_URL}/afspraken`)
  );

  return resend.emails.send({
    from: `Hypecutz <${FROM_EMAIL}>`,
    to: data.customerEmail,
    subject: `Afspraak verplaatst — nieuw tijdstip: ${data.newDateTime}`,
    html,
  });
}

export async function sendBarberInvite(email: string, name: string, tempPassword: string) {
  const resend = getResend();
  const html = baseTemplate(
    "Welkom bij Hypecutz! 🎉",
    p(`Hoi ${name},`) +
    p("Je bent uitgenodigd als kapper bij Hypecutz.") +
    detail("E-mail", email) +
    detail("Tijdelijk wachtwoord", tempPassword) +
    p("Log in en rond je profiel af om te beginnen.") +
    ctaButton("Inloggen", `${APP_URL}/login`)
  );

  return resend.emails.send({
    from: `Hypecutz <${FROM_EMAIL}>`,
    to: email,
    subject: "Je bent uitgenodigd bij Hypecutz",
    html,
  });
}
