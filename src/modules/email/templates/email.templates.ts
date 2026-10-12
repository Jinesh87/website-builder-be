function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(brand: string, body: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1a1d23;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e3e5ea;border-radius:8px;">
          <tr><td style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-weight:bold;font-size:16px;">${escapeHtml(brand)}</p>
            ${body}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export function verificationCodeEmail(params: {
  brand: string;
  fullName: string;
  code: string;
  expiresInMinutes: number;
}): RenderedEmail {
  const name = escapeHtml(params.fullName);
  return {
    subject: `Your verification code: ${params.code}`,
    html: layout(
      params.brand,
      `<h1 style="margin:0 0 12px;font-size:20px;">Verify your email</h1>
       <p style="margin:0 0 16px;line-height:1.5;color:#4b5160;">Hi ${name}, use this code to verify your email address:</p>
       <p style="margin:0 0 16px;font-size:30px;letter-spacing:8px;font-weight:bold;color:#2447c7;">${params.code}</p>
       <p style="margin:0;line-height:1.5;color:#7a8090;font-size:13px;">The code expires in ${params.expiresInMinutes} minutes. If you didn't create an account, you can ignore this email.</p>`,
    ),
    text: `Hi ${params.fullName}, your verification code is ${params.code}. It expires in ${params.expiresInMinutes} minutes.`,
  };
}

export function passwordResetEmail(params: {
  brand: string;
  fullName: string;
  resetLink: string;
  expiresInMinutes: number;
}): RenderedEmail {
  const name = escapeHtml(params.fullName);
  const link = escapeHtml(params.resetLink);
  return {
    subject: "Reset your password",
    html: layout(
      params.brand,
      `<h1 style="margin:0 0 12px;font-size:20px;">Reset your password</h1>
       <p style="margin:0 0 20px;line-height:1.5;color:#4b5160;">Hi ${name}, we received a request to reset your password.</p>
       <p style="margin:0 0 20px;"><a href="${link}" style="display:inline-block;background:#2447c7;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold;">Set a new password</a></p>
       <p style="margin:0;line-height:1.5;color:#7a8090;font-size:13px;">The link expires in ${params.expiresInMinutes} minutes. If you didn't ask for this, you can ignore this email.</p>`,
    ),
    text: `Hi ${params.fullName}, reset your password here: ${params.resetLink} (expires in ${params.expiresInMinutes} minutes).`,
  };
}

export function clientInviteEmail(params: {
  brand: string;
  fullName: string;
  inviteLink: string;
  expiresInHours: number;
}): RenderedEmail {
  const name = escapeHtml(params.fullName);
  const brand = escapeHtml(params.brand);
  const link = escapeHtml(params.inviteLink);
  return {
    subject: `You're invited to ${params.brand}`,
    html: layout(
      params.brand,
      `<h1 style="margin:0 0 12px;font-size:20px;">Your account is ready</h1>
       <p style="margin:0 0 20px;line-height:1.5;color:#4b5160;">Hi ${name}, an account has been created for you on ${brand}. Set a password to log in and start building your website.</p>
       <p style="margin:0 0 20px;"><a href="${link}" style="display:inline-block;background:#2447c7;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold;">Set your password</a></p>
       <p style="margin:0;line-height:1.5;color:#7a8090;font-size:13px;">The link expires in ${params.expiresInHours} hours. If you weren't expecting this, you can ignore this email.</p>`,
    ),
    text: `Hi ${params.fullName}, an account has been created for you on ${params.brand}. Set your password here: ${params.inviteLink} (expires in ${params.expiresInHours} hours).`,
  };
}

export function testEmail(params: { brand: string }): RenderedEmail {
  return {
    subject: "Test email",
    html: layout(
      params.brand,
      `<h1 style="margin:0 0 12px;font-size:20px;">Email is working</h1>
       <p style="margin:0;line-height:1.5;color:#4b5160;">This is a test email from your Super Admin email settings.</p>`,
    ),
    text: "Email is working. This is a test email from your Super Admin email settings.",
  };
}

export function contactFormLeadEmail(params: {
  siteName: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  message: string;
}): RenderedEmail {
  const brand = escapeHtml(params.siteName);
  const name = escapeHtml(params.senderName);
  const email = escapeHtml(params.senderEmail);
  const phone = params.senderPhone ? escapeHtml(params.senderPhone) : "";
  const msg = escapeHtml(params.message).replace(/\n/g, "<br/>");

  return {
    subject: `New inquiry from ${params.senderName} (${params.siteName})`,
    html: layout(
      params.siteName,
      `<h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">New Contact Form Inquiry</h1>
       <p style="margin:0 0 16px;color:#475569;font-size:14px;">Someone submitted the contact form on <strong>${brand}</strong>.</p>
       <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
         <p style="margin:0 0 8px;font-size:14px;"><strong>Name:</strong> ${name}</p>
         <p style="margin:0 0 8px;font-size:14px;"><strong>Email:</strong> <a href="mailto:${email}" style="color:#2563eb;">${email}</a></p>
         ${phone ? `<p style="margin:0 0 8px;font-size:14px;"><strong>Phone:</strong> <a href="tel:${phone}" style="color:#2563eb;">${phone}</a></p>` : ""}
         <p style="margin:0;font-size:14px;"><strong>Message:</strong></p>
         <div style="margin-top:6px;padding:12px;background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;color:#334155;line-height:1.5;">${msg}</div>
       </div>
       <p style="margin:0;color:#94a3b8;font-size:12px;">This inquiry was sent automatically via your published website.</p>`,
    ),
    text: `New inquiry from ${params.senderName} on ${params.siteName}\nName: ${params.senderName}\nEmail: ${params.senderEmail}\n${params.senderPhone ? `Phone: ${params.senderPhone}\n` : ""}Message:\n${params.message}`,
  };
}
