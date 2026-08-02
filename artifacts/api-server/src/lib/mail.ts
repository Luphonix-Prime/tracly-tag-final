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

export async function sendSsoRequestUserEmail(to: string, username: string): Promise<void> {
  if (!user || !pass) {
    console.log(`[SMTP Mail Bypass] SMTP credentials missing in env. SSO Request User Notification for ${to} (${username})`);
    return;
  }

  const mailOptions = {
    from: `"TracelyTag System" <${user}>`,
    to,
    subject: "TracelyTag SSO User Access Request Submitted",
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: 0 auto; color: #1E293B;">
        <h2 style="color: #2563EB; border-bottom: 2px solid #2563EB; padding-bottom: 10px; text-transform: uppercase; margin-top: 0;">SSO Access Request Received</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>Your SSO account creation request for TracelyTag has been submitted successfully.</p>
        <p>A Super Master or Master administrator will review and approve your request. Once approved and created by an administrator, you will be able to log in with your SSO credentials.</p>
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
        <p style="font-size: 10px; color: #94A3B8; text-align: center; margin-bottom: 0;">TracelyTag Industrial Security Panel • Automated System Message</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP Mail] SSO request confirmation sent to user ${to}`);
  } catch (err) {
    console.error(`[SMTP Mail Error] Failed to send user SSO notification to ${to}:`, err);
  }
}

export async function sendSsoRequestAdminEmail(adminEmails: string[], username: string, requesterEmail: string, provider: string, companyName?: string): Promise<void> {
  if (!adminEmails || adminEmails.length === 0) return;

  if (!user || !pass) {
    console.log(`[SMTP Mail Bypass] SMTP credentials missing in env. SSO Request Admin Notification to ${adminEmails.join(", ")} for requester ${requesterEmail}`);
    return;
  }

  const mailOptions = {
    from: `"TracelyTag System" <${user}>`,
    to: adminEmails.join(", "),
    subject: `Action Required: New SSO Access Request (${username})`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 550px; margin: 0 auto; color: #1E293B;">
        <h2 style="color: #D97706; border-bottom: 2px solid #D97706; padding-bottom: 10px; text-transform: uppercase; margin-top: 0;">New SSO Access Request</h2>
        <p>A new SSO user access request requires approval:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 6px; font-weight: bold; border-bottom: 1px solid #F1F5F9;">Username:</td><td style="padding: 6px; border-bottom: 1px solid #F1F5F9;">${username}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold; border-bottom: 1px solid #F1F5F9;">Email:</td><td style="padding: 6px; border-bottom: 1px solid #F1F5F9;">${requesterEmail}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold; border-bottom: 1px solid #F1F5F9;">Provider:</td><td style="padding: 6px; border-bottom: 1px solid #F1F5F9;">${provider}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold; border-bottom: 1px solid #F1F5F9;">Company:</td><td style="padding: 6px; border-bottom: 1px solid #F1F5F9;">${companyName || "Unassigned"}</td></tr>
        </table>
        <p>Please log in to TracelyTag as Master or Super Master and open <strong>Users → SSO User Requests</strong> tab to accept and create the account.</p>
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
        <p style="font-size: 10px; color: #94A3B8; text-align: center; margin-bottom: 0;">TracelyTag Master Control Panel • Automated System Message</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP Mail] SSO request admin notification sent to ${adminEmails.join(", ")}`);
  } catch (err) {
    console.error(`[SMTP Mail Error] Failed to send admin SSO notification:`, err);
  }
}

export async function sendSsoApprovedWelcomeEmail(to: string, username: string, rawPassword?: string, role?: string, companyName?: string): Promise<void> {
  if (!user || !pass) {
    console.log(`[SMTP Mail Bypass] SMTP credentials missing in env. SSO Account Created Notification for ${to} (${username}) with password: ${rawPassword || '(unspecified)'}`);
    return;
  }

  const mailOptions = {
    from: `"TracelyTag Security" <${user}>`,
    to,
    subject: "Your TracelyTag Account Has Been Created & Approved",
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 550px; margin: 0 auto; color: #1E293B;">
        <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px; text-transform: uppercase; margin-top: 0;">Account Approved & Created</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>Your TracelyTag access request has been approved by the Master Administrator. Your account is now active and ready to use!</p>
        <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Username:</strong> <code style="color: #2563EB;">${username}</code></p>
          <p style="margin: 4px 0;"><strong>Email:</strong> ${to}</p>
          ${role ? `<p style="margin: 4px 0;"><strong>Assigned Role:</strong> ${role}</p>` : ''}
          ${companyName ? `<p style="margin: 4px 0;"><strong>Company:</strong> ${companyName}</p>` : ''}
          ${rawPassword ? `<p style="margin: 8px 0 0 0; padding-top: 8px; border-top: 1px dashed #CBD5E1;"><strong>Login Password:</strong> <code style="font-size: 16px; font-weight: bold; color: #0F172A; font-family: monospace;">${rawPassword}</code></p>` : ''}
        </div>
        <p>You can now sign in using your SSO provider or using your username and password above.</p>
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
        <p style="font-size: 10px; color: #94A3B8; text-align: center; margin-bottom: 0;">TracelyTag Industrial Security Panel • Automated System Message</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[SMTP Mail] SSO account approved welcome email sent to ${to}`);
  } catch (err) {
    console.error(`[SMTP Mail Error] Failed to send welcome email to ${to}:`, err);
  }
}
