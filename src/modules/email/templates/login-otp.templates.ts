import { escapeHtml, layout, type RenderedEmail } from "./email.templates.js";

export function loginOtpEmail(params: {
  brand: string;
  fullName: string;
  code: string;
  expiresInMinutes: number;
  /** The account being signed in to, shown so shared inboxes know which login asked. */
  accountEmail: string;
}): RenderedEmail {
  const name = escapeHtml(params.fullName);
  const account = escapeHtml(params.accountEmail);
  return {
    subject: `Your login code: ${params.code}`,
    html: layout(
      params.brand,
      `<h1 style="margin:0 0 12px;font-size:20px;">Your login code</h1>
       <p style="margin:0 0 16px;line-height:1.5;color:#4b5160;">Hi ${name}, use this code to finish signing in to <strong>${account}</strong>:</p>
       <p style="margin:0 0 16px;font-size:30px;letter-spacing:8px;font-weight:bold;color:#2447c7;">${params.code}</p>
       <p style="margin:0;line-height:1.5;color:#7a8090;font-size:13px;">The code expires in ${params.expiresInMinutes} minutes. If you didn't try to log in, change your password; someone knows it.</p>`,
    ),
    text: `Hi ${params.fullName}, your login code for ${params.accountEmail} is ${params.code}. It expires in ${params.expiresInMinutes} minutes. If you didn't try to log in, change your password.`,
  };
}
