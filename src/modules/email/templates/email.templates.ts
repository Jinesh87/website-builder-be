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

export function emailChangeCodeEmail(params: {
  brand: string;
  fullName: string;
  code: string;
  expiresInMinutes: number;
}): RenderedEmail {
  const name = escapeHtml(params.fullName);
  return {
    subject: `Confirm your new email: ${params.code}`,
    html: layout(
      params.brand,
      `<h1 style="margin:0 0 12px;font-size:20px;">Confirm your new email</h1>
       <p style="margin:0 0 16px;line-height:1.5;color:#4b5160;">Hi ${name}, use this code to add this email address to your account:</p>
       <p style="margin:0 0 16px;font-size:30px;letter-spacing:8px;font-weight:bold;color:#2447c7;">${params.code}</p>
       <p style="margin:0;line-height:1.5;color:#7a8090;font-size:13px;">The code expires in ${params.expiresInMinutes} minutes. If you didn't ask for this, you can ignore this email.</p>`,
    ),
    text: `Hi ${params.fullName}, your code to confirm your new email is ${params.code}. It expires in ${params.expiresInMinutes} minutes.`,
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

/** Hosting billing notices: renewal reminders, expiry, site offline, renewed. */
export function hostingNoticeEmail(params: {
  brand: string;
  fullName: string;
  subject: string;
  heading: string;
  lines: string[];
  actionLabel: string;
  actionLink: string;
}): RenderedEmail {
  const name = escapeHtml(params.fullName);
  const link = escapeHtml(params.actionLink);
  const paragraphs = params.lines
    .map((line) => `<p style="margin:0 0 12px;line-height:1.5;color:#4b5160;">${escapeHtml(line)}</p>`)
    .join("");
  return {
    subject: params.subject,
    html: layout(
      params.brand,
      `<h1 style="margin:0 0 12px;font-size:20px;">${escapeHtml(params.heading)}</h1>
       <p style="margin:0 0 12px;line-height:1.5;color:#4b5160;">Hi ${name},</p>
       ${paragraphs}
       <p style="margin:8px 0 0;"><a href="${link}" style="display:inline-block;background:#2447c7;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold;">${escapeHtml(params.actionLabel)}</a></p>`,
    ),
    text: `Hi ${params.fullName},\n\n${params.lines.join("\n")}\n\n${params.actionLabel}: ${params.actionLink}`,
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

/** A Super Admin's reply to a contact-page enquiry, with the customer's original message quoted below. */
export function enquiryReplyEmail(params: {
  brand: string;
  subject: string;
  message: string;
  customerName: string;
  originalMessage: string;
  submittedAt: Date;
}): RenderedEmail {
  const reply = escapeHtml(params.message.trim()).replace(/\n/g, "<br/>");
  const original = escapeHtml(params.originalMessage.trim()).replace(/\n/g, "<br/>");
  const sentOn = params.submittedAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const quoteHeading = `On ${sentOn} IST, ${params.customerName.trim()} wrote:`;

  return {
    subject: params.subject.replace(/[\r\n]+/g, " ").trim(),
    html: layout(
      params.brand,
      `<div style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#1a1d23;word-break:break-word;">${reply}</div>
       <p style="margin:0 0 6px;font-size:12px;color:#7a8090;">${escapeHtml(quoteHeading)}</p>
       <div style="margin:0;padding:10px 14px;border-left:3px solid #e3e5ea;font-size:13px;line-height:1.55;color:#4b5160;word-break:break-word;">${original}</div>`,
    ),
    text: `${params.message.trim()}\n\n${quoteHeading}\n${params.originalMessage
      .trim()
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n")}`,
  };
}

export type ContactLeadField = { label: string; value: string };

function contactFieldsLeadEmail(params: {
  siteName: string;
  senderName: string;
  fields: ContactLeadField[];
}): RenderedEmail {
  const brand = escapeHtml(params.siteName);
  const rows = params.fields
    .map(
      (field) =>
        `<tr>
           <td style="padding:8px 12px 8px 0;vertical-align:top;width:160px;color:#64748b;font-size:13px;font-weight:600;">${escapeHtml(field.label)}</td>
           <td style="padding:8px 0;vertical-align:top;color:#0f172a;font-size:14px;line-height:1.5;word-break:break-word;">${escapeHtml(field.value).replace(/\n/g, "<br/>")}</td>
         </tr>`,
    )
    .join("");

  return {
    subject: `New inquiry from ${params.senderName} (${params.siteName})`,
    html: layout(
      params.siteName,
      `<h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">New Contact Form Inquiry</h1>
       <p style="margin:0 0 16px;color:#475569;font-size:14px;">Someone submitted the contact form on <strong>${brand}</strong>.</p>
       <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
       </div>
       <p style="margin:0;color:#94a3b8;font-size:12px;">This inquiry was sent automatically via your published website.</p>`,
    ),
    text: `New inquiry from ${params.senderName} on ${params.siteName}\n\n${params.fields
      .map((field) => `${field.label}: ${field.value}`)
      .join("\n")}`,
  };
}

export function contactFormLeadEmail(params: {
  siteName: string;
  senderName: string;
  senderEmail?: string;
  senderPhone?: string;
  message: string;
  /** Every answered field of a customized form; replaces the fixed name/email/phone/message layout. */
  fields?: ContactLeadField[];
}): RenderedEmail {
  if (params.fields?.length) {
    return contactFieldsLeadEmail({ siteName: params.siteName, senderName: params.senderName, fields: params.fields });
  }
  const brand = escapeHtml(params.siteName);
  const name = escapeHtml(params.senderName);
  const email = escapeHtml(params.senderEmail ?? "");
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
    text: `New inquiry from ${params.senderName} on ${params.siteName}\nName: ${params.senderName}\nEmail: ${params.senderEmail ?? ""}\n${params.senderPhone ? `Phone: ${params.senderPhone}\n` : ""}Message:\n${params.message}`,
  };
}

export function salesInquiryEmail(params: {
  brand?: string;
  to: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  subject?: string;
  message: string;
  submittedAt?: Date;
}): RenderedEmail {
  const brandName = params.brand?.trim() || "Bytezora";
  const name = escapeHtml(params.senderName.trim());
  const email = escapeHtml(params.senderEmail.trim());
  const recipient = escapeHtml(params.to.trim());
  const phone = params.senderPhone?.trim() ? escapeHtml(params.senderPhone.trim()) : "";
  const subject = (params.subject?.trim() || "General question").replace(/[\r\n]+/g, " ");
  const escapedSubject = escapeHtml(subject);
  const msgHtml = escapeHtml(params.message.trim()).replace(/\n/g, "<br/>");
  const dateObj = params.submittedAt || new Date();
  const dateStr = dateObj.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }) + " IST";

  const mailtoReply = `mailto:${encodeURIComponent(params.senderEmail.trim())}?subject=${encodeURIComponent(`Re: ${subject} - Bytezora`)}`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Inquiry from ${name}</title>
  </head>
  <body style="margin:0;padding:24px 12px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.06);">
            <!-- Accent Top Stripe -->
            <tr>
              <td style="height:5px;background:linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);"></td>
            </tr>
            <!-- Header -->
            <tr>
              <td style="background-color:#0f172a;padding:28px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>
                      <span style="display:inline-block;background-color:#1e293b;border:1px solid #334155;color:#38bdf8;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                        ${escapeHtml(brandName)} WebBuilder
                      </span>
                    </td>
                    <td align="right">
                      <span style="display:inline-block;background-color:rgba(37,99,235,0.25);border:1px solid rgba(59,130,246,0.4);color:#93c5fd;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:0.5px;">
                        SALES LEAD
                      </span>
                    </td>
                  </tr>
                </table>
                <h1 style="margin:20px 0 6px;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;line-height:1.25;">
                  New Client Inquiry Received
                </h1>
                <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.5;">
                  A prospective client submitted an inquiry through the official contact portal.
                </p>
              </td>
            </tr>
            <!-- Content Body -->
            <tr>
              <td style="padding:28px 32px;">
                <!-- Topic & Date Pill -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                  <tr>
                    <td>
                      <span style="display:inline-block;padding:6px 14px;background-color:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.3px;">
                        📌 Topic: ${escapedSubject}
                      </span>
                    </td>
                    <td align="right" style="color:#64748b;font-size:12px;font-weight:500;">
                      📅 ${dateStr}
                    </td>
                  </tr>
                </table>

                <!-- Client Information Card -->
                <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 22px;margin-bottom:24px;">
                  <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">
                    Client Contact Details
                  </p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding:6px 0;width:120px;color:#64748b;font-size:13px;font-weight:600;">Full name:</td>
                      <td style="padding:6px 0;color:#0f172a;font-size:15px;font-weight:700;">${name}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Email address:</td>
                      <td style="padding:6px 0;font-size:14px;">
                        <a href="mailto:${email}" style="color:#2563eb;font-weight:600;text-decoration:none;">${email}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Phone number:</td>
                      <td style="padding:6px 0;font-size:14px;">
                        ${
                          phone
                            ? `<a href="tel:${phone}" style="color:#2563eb;font-weight:600;text-decoration:none;">${phone}</a>`
                            : `<span style="color:#94a3b8;font-style:italic;">Not provided</span>`
                        }
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600;">Recipient:</td>
                      <td style="padding:6px 0;color:#334155;font-size:13px;font-weight:600;">
                        ${recipient}
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Client Message Card -->
                <div style="margin-bottom:28px;">
                  <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">
                    Client Inquiry Message
                  </p>
                  <div style="background-color:#ffffff;border:1px solid #cbd5e1;border-left:4px solid #2563eb;border-radius:8px;padding:18px 20px;color:#1e293b;font-size:14px;line-height:1.65;word-break:break-word;">
                    ${msgHtml}
                  </div>
                </div>

                <!-- Quick Action Buttons -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>
                      <a href="${mailtoReply}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;box-shadow:0 2px 6px rgba(37,99,235,0.3);">
                        ✉️ Reply to ${name}
                      </a>
                    </td>
                    ${
                      phone
                        ? `<td style="padding-left:12px;">
                             <a href="tel:${phone}" style="display:inline-block;background-color:#f1f5f9;color:#0f172a;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;border:1px solid #cbd5e1;">
                               📞 Call Client
                             </a>
                           </td>`
                        : ""
                    }
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background-color:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;">
                <p style="margin:0 0 6px;color:#0f172a;font-weight:700;font-size:13px;">
                  Bytezora Technologies
                </p>
                <p style="margin:0 0 6px;">
                  India Headquarters: Ground Floor, 287/A, Ernakulam, Kerala – 682315
                </p>
                <p style="margin:0 0 10px;">
                  Support: <a href="mailto:Support@bytezoracoders.com" style="color:#2563eb;text-decoration:none;">Support@bytezoracoders.com</a> &nbsp;|&nbsp; Phone: <a href="tel:+919995070483" style="color:#2563eb;text-decoration:none;">+91 (999) 50-70483</a>
                </p>
                <p style="margin:0;color:#94a3b8;font-size:11px;">
                  This automated message was dispatched to <strong>${recipient}</strong> from the Bytezora Website Builder contact form.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `============================================================
BYTEZORA WEBBUILDER - NEW CLIENT INQUIRY
============================================================

A new client inquiry was received from the contact portal:

TOPIC:      ${subject}
DATE/TIME:  ${dateStr}

CLIENT DETAILS:
- Full Name:    ${params.senderName}
- Email:        ${params.senderEmail}
- Phone:        ${params.senderPhone || "Not provided"}
- Routed To:    ${params.to.trim()}

MESSAGE:
------------------------------------------------------------
${params.message}
------------------------------------------------------------

QUICK ACTIONS:
- Reply to client: ${mailtoReply}
${params.senderPhone ? `- Call client: tel:${params.senderPhone}\n` : ""}
------------------------------------------------------------
Bytezora Technologies
India Headquarters: Ground Floor, 287/A, Ernakulam, Kerala - 682315
Support: Support@bytezoracoders.com | Phone: +91 (999) 50-70483
`;

  return {
    subject: `[Bytezora Sales] New Inquiry: ${subject} from ${params.senderName}`,
    html,
    text,
  };
}
