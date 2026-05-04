import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBookingEmailToHost(data: {
  to: string;
  property: string;
  guest: string;
  email: string;
  phone?: string | null;
  dates: string;
  total?: number | null;
}) {
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

    console.log("📧 Email inviata:", response);
  } catch (error) {
    console.error("❌ Errore invio email:", error);
  }
}