import nodemailer from "nodemailer";
import { config } from "../config.js";

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  body: string;
  attachments?: Array<{ filename: string; content: string | Buffer }>;
}

export function isEmailConfigured(): boolean {
  return !!(config.smtpHost && config.smtpUser && config.smtpPass && config.smtpFrom);
}

export async function sendEmail(options: SendMailOptions): Promise<{ messageId: string; skipped?: boolean }> {
  if (!isEmailConfigured()) {
    return { messageId: "", skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  const info = await transporter.sendMail({
    from: config.smtpFrom,
    to: options.to,
    subject: options.subject,
    text: options.body,
    attachments: options.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  return { messageId: info.messageId };
}
