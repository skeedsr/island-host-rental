import { Resend } from "resend";

// Resend email service - will be enabled when RESEND_API_KEY is configured
// const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBookingEmailToHost(data: {
  to: string;
  property: string;
  guest: string;
  email: string;
  phone?: string | null;
  dates: string;
  total?: number | null;
}) {
  console.log("🔥 MAILER CHIAMATO");
  console.log("➡️ INVIO A:", data.to);
  console.log("➡️ API KEY PRESENTE:", !!process.env.RESEND_API_KEY);

  // Email sending disabled until RESEND_API_KEY is configured
  if (!process.env.RESEND_API_KEY) {
    console.log("⚠️ RESEND_API_KEY non configurato - email non inviate");
    return { id: "mock-" + Date.now(), message: "Email mock (API key non configurato)" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const response = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: data.to,
      subject: "Nuova richiesta prenotazione",
      html: `
        <h2>Nuova richiesta di prenotazione</h2>
        <p><strong>Proprietà:</strong> ${data.property}</p>
        <p><strong>Ospite:</strong> ${data.guest}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Telefono:</strong> ${data.phone ?? "-"}</p>
        <p><strong>Date:</strong> ${data.dates}</p>
        <p><strong>Totale:</strong> ${data.total ?? "-"}</p>
      `,
    });

    console.log("📧 RISPOSTA RESEND:", response);

    if (!response || (response as any).error) {
      console.error("❌ RESEND ERROR:", response);
      throw new Error(JSON.stringify((response as any).error ?? response));
    }

    return response;

  } catch (error: any) {
    console.error("❌ ERRORE INVIO EMAIL:", error?.message || error);
    throw new Error(error?.message || "Errore invio email");
  }
}