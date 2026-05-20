import { z } from "zod";
import { sendEmail } from "../clients/smtpClient.js";

export const name = "send_email";

export const description =
  "Send an email notification via SMTP. Supports multiple recipients and optional attachments.";

export const inputSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]).describe("Recipient email address(es)"),
  subject: z.string().describe("Email subject"),
  body: z.string().describe("Email body text"),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.string().describe("Attachment content as string or base64"),
      })
    )
    .optional()
    .describe("Optional file attachments"),
});

export async function handler(args: z.infer<typeof inputSchema>): Promise<any> {
  const result = await sendEmail({
    to: args.to,
    subject: args.subject,
    body: args.body,
    attachments: args.attachments,
  });

  if (result.skipped) {
    return {
      content: [
        {
          type: "text",
          text: "Email notification skipped: SMTP is not configured.",
        },
      ],
      structuredContent: {
        skipped: true,
        reason: "SMTP not configured",
      },
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Email sent successfully. Message ID: ${result.messageId}`,
      },
    ],
    structuredContent: {
      messageId: result.messageId,
      recipients: Array.isArray(args.to) ? args.to : [args.to],
    },
  };
}
