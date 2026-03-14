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

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@hypesamba.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://hypesamba.com";

// ─── Modern HTML Template ───────────────────────────────────────────────

function template(content: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { margin:0; padding:0; background:#0F0F0F; font-family:'Helvetica Neue',Arial,sans-serif; }
    .wrapper { max-width:460px; margin:0 auto; padding:40px 20px; }
    .logo { text-align:center; padding-bottom:32px; }
    .logo h1 { color:#C9A84C; font-size:26px; letter-spacing:4px; margin:0; font-weight:800; }
    .logo p { color:#666; font-size:9px; letter-spacing:6px; margin:4px 0 0; text-transform:uppercase; }
    .card { background:#1A1A1A; border-radius:16px; padding:32px 24px; border:1px solid #2A2A2A; }
    .badge { display:inline-block; background:#C9A84C; color:#0F0F0F; font-size:11px; font-weight:700; letter-spacing:1px; padding:5px 14px; border-radius:20px; text-transform:uppercase; margin-bottom:20px; }
    .title { color:#F5F5F5; font-size:22px; font-weight:700; margin:0 0 8px; line-height:1.3; }
    .subtitle { color:#888; font-size:14px; margin:0 0 24px; line-height:1.5; }
    .detail-grid { border-top:1px solid #2A2A2A; padding-top:20px; }
    .detail-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #222; }
    .detail-label { color:#888; font-size:13px; }
    .detail-value { color:#F5F5F5; font-size:13px; font-weight:600; text-align:right; }
    .price-row { display:flex; justify-content:space-between; padding:16px 0 0; }
    .price-label { color:#F5F5F5; font-size:15px; font-weight:600; }
    .price-value { color:#C9A84C; font-size:22px; font-weight:800; }
    .cta { display:block; background:#C9A84C; color:#0F0F0F; text-decoration:none; text-align:center; padding:14px 32px; border-radius:10px; font-weight:700; font-size:15px; margin-top:24px; letter-spacing:0.5px; }
    .footer { text-align:center; padding-top:32px; }
    .footer p { color:#555; font-size:11px; margin:4px 0; }
    .footer a { color:#C9A84C; text-decoration:none; }
    .divider { height:1px; background:#2A2A2A; margin:24px 0; }
    .icon-row { display:flex; align-items:center; gap:12px; margin-bottom:6px; }
    .icon-circle { width:36px; height:36px; background:#C9A84C15; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:16px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">
      <h1>HYPECUTZ</h1>
      <p>Rotterdam</p>
    </div>
    ${content}
    <div class="footer">
      <p>Hypecutz — Schiedamseweg 28A, Rotterdam</p>
      <p><a href="${APP_URL}">hypesamba.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${value}</span></div>`;
}

// ─── Email Data Interface ───────────────────────────────────────────────

export interface AppointmentEmailData {
  customerName: string;
  customerEmail: string;
  barberName: string;
  serviceName: string;
  dateTime: string;
  price: string;
}

// ─── Appointment Confirmed ──────────────────────────────────────────────

export async function sendAppointmentConfirmation(data: AppointmentEmailData) {
  const resend = getResend();
  const html = template(`
    <div class="card">
      <span class="badge">✂️ Bevestigd</span>
      <h2 class="title">Je afspraak staat vast!</h2>
      <p class="subtitle">Hey ${data.customerName}, alles is geregeld. We zien je binnenkort bij Hypecutz.</p>
      <div class="detail-grid">
        ${detailRow("Kapper", data.barberName)}
        ${detailRow("Behandeling", data.serviceName)}
        ${detailRow("Wanneer", data.dateTime)}
        <div class="price-row">
          <span class="price-label">Totaal</span>
          <span class="price-value">${data.price}</span>
        </div>
      </div>
      <a href="${APP_URL}/afspraken" class="cta">Bekijk afspraak →</a>
    </div>
    <div style="text-align:center;padding-top:20px;">
      <p style="color:#666;font-size:12px;">📍 Schiedamseweg 28A, Rotterdam</p>
    </div>
  `);

  return resend.emails.send({
    from: `Hypecutz <${FROM_EMAIL}>`,
    to: data.customerEmail,
    subject: `✂️ Bevestigd — ${data.serviceName} bij ${data.barberName}`,
    html,
  });
}

// ─── 2-Hour Reminder ────────────────────────────────────────────────────

export async function sendAppointmentReminder(data: AppointmentEmailData) {
  const resend = getResend();
  const html = template(`
    <div class="card">
      <span class="badge">⏰ Herinnering</span>
      <h2 class="title">Over 2 uur ben je aan de beurt!</h2>
      <p class="subtitle">Hey ${data.customerName}, vergeet je afspraak niet vandaag.</p>
      <div class="detail-grid">
        ${detailRow("Kapper", data.barberName)}
        ${detailRow("Behandeling", data.serviceName)}
        ${detailRow("Tijd", data.dateTime)}
        <div class="price-row">
          <span class="price-label">Totaal</span>
          <span class="price-value">${data.price}</span>
        </div>
      </div>
      <a href="${APP_URL}/afspraken" class="cta">Bekijk afspraak →</a>
    </div>
    <div style="text-align:center;padding-top:20px;">
      <p style="color:#666;font-size:12px;">📍 Schiedamseweg 28A, Rotterdam · <a href="https://maps.google.com/?q=Schiedamseweg+28A+Rotterdam" style="color:#C9A84C;text-decoration:none;">Route →</a></p>
    </div>
  `);

  return resend.emails.send({
    from: `Hypecutz <${FROM_EMAIL}>`,
    to: data.customerEmail,
    subject: `⏰ Over 2 uur: ${data.serviceName} bij ${data.barberName}`,
    html,
  });
}

// ─── Appointment Cancelled ──────────────────────────────────────────────

export async function sendAppointmentCancelled(data: AppointmentEmailData & { reason?: string }) {
  const resend = getResend();
  const html = template(`
    <div class="card">
      <span class="badge" style="background:#EF4444;color:#fff;">Geannuleerd</span>
      <h2 class="title">Afspraak geannuleerd</h2>
      <p class="subtitle">Hey ${data.customerName}, je afspraak is helaas geannuleerd.${data.reason ? ` Reden: ${data.reason}` : ""}</p>
      <div class="detail-grid">
        ${detailRow("Kapper", data.barberName)}
        ${detailRow("Behandeling", data.serviceName)}
        ${detailRow("Was gepland op", data.dateTime)}
      </div>
      <a href="${APP_URL}/boeken" class="cta">Nieuwe afspraak boeken →</a>
    </div>
  `);

  return resend.emails.send({
    from: `Hypecutz <${FROM_EMAIL}>`,
    to: data.customerEmail,
    subject: `Afspraak geannuleerd — ${data.serviceName}`,
    html,
  });
}

// ─── Barber Invite ──────────────────────────────────────────────────────

export async function sendBarberInvite(email: string, name: string, tempPassword: string) {
  const resend = getResend();
  const html = template(`
    <div class="card">
      <span class="badge">🎉 Uitnodiging</span>
      <h2 class="title">Welkom bij het team!</h2>
      <p class="subtitle">Hey ${name}, je bent uitgenodigd als kapper bij Hypecutz. Log in en stel je profiel in.</p>
      <div class="detail-grid">
        ${detailRow("E-mail", email)}
        ${detailRow("Wachtwoord", tempPassword)}
      </div>
      <div class="divider"></div>
      <p style="color:#888;font-size:12px;margin:0;">Wijzig je wachtwoord na je eerste login.</p>
      <a href="${APP_URL}/login" class="cta">Inloggen →</a>
    </div>
  `);

  return resend.emails.send({
    from: `Hypecutz <${FROM_EMAIL}>`,
    to: email,
    subject: "🎉 Je bent uitgenodigd bij Hypecutz",
    html,
  });
}

// ─── New Booking Notification to Barber ─────────────────────────────────

export async function sendNewBookingToBarber(barberEmail: string, barberName: string, customerName: string, serviceName: string, dateTime: string) {
  const resend = getResend();
  const html = template(`
    <div class="card">
      <span class="badge">📅 Nieuwe boeking</span>
      <h2 class="title">Nieuwe klant geboekt!</h2>
      <p class="subtitle">Hey ${barberName}, je hebt een nieuwe afspraak.</p>
      <div class="detail-grid">
        ${detailRow("Klant", customerName)}
        ${detailRow("Behandeling", serviceName)}
        ${detailRow("Wanneer", dateTime)}
      </div>
      <a href="${APP_URL}/kapper/dashboard" class="cta">Bekijk dashboard →</a>
    </div>
  `);

  return resend.emails.send({
    from: `Hypecutz <${FROM_EMAIL}>`,
    to: barberEmail,
    subject: `📅 Nieuwe boeking: ${customerName} — ${serviceName}`,
    html,
  });
}
