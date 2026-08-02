import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = parseInt(process.env.SMTP_PORT || "587", 10);
const secure = process.env.SMTP_SECURE === "true"; // true for port 465, false for other ports
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user,
    pass,
  },
});

export async function sendOtpEmail(to: string, otpCode: string): Promise<void> {
  if (!user || !pass) {
    console.log(`[SMTP Mail Bypass] SMTP credentials missing in env. OTP for ${to} is: ${otpCode}`);
    return;
  }

  const mailOptions = {
    from: `"TracelyTag Security" <${user}>`,
    to,
    subject: "Your TracelyTag One-Time Password (OTP)",
    text: `Your One-Time Password (OTP) for TracelyTag login is: ${otpCode}. It is valid for 5 minutes.`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: 0 auto; color: #1E293B;">
        <h2 style="color: #2563EB; border-bottom: 2px solid #2563EB; padding-bottom: 10px; text-transform: uppercase; margin-top: 0;">TracelyTag Login OTP</h2>
        <p>Dear User,</p>
        <p>A login attempt was made for your TracelyTag account. Please use the following One-Time Password (OTP) to complete your sign-in:</p>
        <div style="background-color: #F8FAFC; border: 1px dashed #CBD5E1; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0F172A; font-family: monospace;">${otpCode}</span>
        </div>
        <p style="font-size: 11px; color: #64748B;">This OTP is valid for 5 minutes. If you did not initiate this login, please change your password immediately.</p>
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
        <p style="font-size: 10px; color: #94A3B8; text-align: center; margin-bottom: 0;">TracelyTag Industrial Security Panel • Automated System Message</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`[SMTP Mail] OTP email successfully sent to ${to}`);
}


