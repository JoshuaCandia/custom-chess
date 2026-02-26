import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST ?? "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT ?? 587),
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const html = `
    <div style="background:#1c1512;color:#e8d5b7;font-family:system-ui,sans-serif;padding:40px;border-radius:16px;max-width:480px;margin:0 auto;">
      <div style="margin-bottom:24px;">
        <span style="font-size:1.5rem;">♟</span>
        <span style="font-size:0.75rem;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(200,162,96,0.7);margin-left:8px;">Custom Chess</span>
      </div>

      <h2 style="margin:0 0 8px;font-size:1.3rem;font-weight:700;color:#e8d5b7;">
        Your verification code
      </h2>
      <p style="margin:0 0 28px;font-size:0.875rem;color:rgba(232,213,183,0.5);">
        Enter this code to complete your registration. It expires in <strong style="color:rgba(232,213,183,0.75);">10 minutes</strong>.
      </p>

      <div style="background:rgba(200,162,96,0.1);border:1px solid rgba(200,162,96,0.3);border-radius:12px;padding:24px;text-align:center;">
        <span style="font-family:monospace;font-size:2.5rem;font-weight:700;letter-spacing:0.3em;color:#c8a56a;">
          ${otp}
        </span>
      </div>

      <p style="margin:24px 0 0;font-size:0.75rem;color:rgba(232,213,183,0.3);">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "Custom Chess <noreply@chess.local>",
    to,
    subject: `${otp} — your Custom Chess verification code`,
    html,
    text: `Your Custom Chess verification code is: ${otp}\nExpires in 10 minutes.`,
  });
}
